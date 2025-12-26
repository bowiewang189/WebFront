export type FourierFinalParams = {
  order: number;        // N (epicycle order)
  samples: number;      // contour resample count for coefficients
  drawSamples: number;  // points drawn for reconstructed curve
  margin: number;       // padding (0.02 recommended)
  centerY: number;      // pixel shift after scaling (usually 0)
  downscaleW: number;   // e.g. 360 (bigger = better contour, slower)
};

type Complex = { re: number; im: number };
type Pt = { x: number; y: number };

function cadd(a: Complex, b: Complex): Complex { return { re: a.re + b.re, im: a.im + b.im }; }
function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cscale(a: Complex, s: number): Complex { return { re: a.re * s, im: a.im * s }; }
function cexp(theta: number): Complex { return { re: Math.cos(theta), im: Math.sin(theta) }; }

function otsuThreshold(gray: Uint8ClampedArray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let varMax = -1;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

function imageToGray(img: HTMLImageElement, targetW: number) {
  const scale = targetW / img.naturalWidth;
  const w = Math.max(32, Math.round(img.naturalWidth * scale));
  const h = Math.max(32, Math.round(img.naturalHeight * scale));

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported.");

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    gray[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return { gray, w, h };
}

function buildMask(gray: Uint8ClampedArray, thr: number) {
  // foreground = darker than threshold
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] <= thr ? 1 : 0;
  return mask;
}

function invertMask(mask: Uint8Array) {
  for (let i = 0; i < mask.length; i++) mask[i] = mask[i] ? 0 : 1;
}

function countOnes(mask: Uint8Array) {
  let s = 0;
  for (let i = 0; i < mask.length; i++) s += mask[i];
  return s;
}

/**
 * Find largest connected component (4-neighborhood) in a binary mask.
 * Returns labels array (Int32) and info about best component.
 */
function largestComponent(mask: Uint8Array, w: number, h: number) {
  const labels = new Int32Array(mask.length);
  labels.fill(-1);

  const qx = new Int32Array(mask.length);
  const qy = new Int32Array(mask.length);

  let bestLabel = -1;
  let bestArea = 0;

  let curLabel = 0;

  const idx = (x: number, y: number) => y * w + x;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = idx(x, y);
      if (!mask[id] || labels[id] !== -1) continue;

      // BFS
      let head = 0, tail = 0;
      qx[tail] = x; qy[tail] = y; tail++;
      labels[id] = curLabel;
      let area = 0;

      while (head < tail) {
        const cx = qx[head], cy = qy[head]; head++;
        area++;

        // 4-neighbors
        const nbs = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nid = idx(nx, ny);
          if (!mask[nid] || labels[nid] !== -1) continue;
          labels[nid] = curLabel;
          qx[tail] = nx; qy[tail] = ny; tail++;
        }
      }

      if (area > bestArea) {
        bestArea = area;
        bestLabel = curLabel;
      }
      curLabel++;
    }
  }

  return { labels, bestLabel, bestArea, labelCount: curLabel };
}

function isBoundaryPixel(labels: Int32Array, w: number, h: number, x: number, y: number, targetLabel: number) {
  const idx = (xx: number, yy: number) => yy * w + xx;
  const id = idx(x, y);
  if (labels[id] !== targetLabel) return false;

  // If any 8-neighbor is not targetLabel, it's boundary
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) return true;
      if (labels[idx(nx, ny)] !== targetLabel) return true;
    }
  }
  return false;
}

/**
 * Moore-Neighbor tracing (clockwise) for boundary of a labeled component.
 * Returns ordered boundary points (pixel centers).
 */
function traceBoundary(labels: Int32Array, w: number, h: number, targetLabel: number) {
  // Find starting boundary pixel: top-most then left-most
  let sx = -1, sy = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isBoundaryPixel(labels, w, h, x, y, targetLabel)) {
        sx = x; sy = y;
        break;
      }
    }
    if (sx !== -1) break;
  }
  if (sx === -1) throw new Error("No boundary found. Try a clearer silhouette image.");

  // Moore neighborhood offsets in clockwise order (starting from left)
  const nb: Pt[] = [
    { x: -1, y:  0 }, // W
    { x: -1, y: -1 }, // NW
    { x:  0, y: -1 }, // N
    { x:  1, y: -1 }, // NE
    { x:  1, y:  0 }, // E
    { x:  1, y:  1 }, // SE
    { x:  0, y:  1 }, // S
    { x: -1, y:  1 }, // SW
  ];

  const idx = (x: number, y: number) => y * w + x;
  const inside = (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h && labels[idx(x, y)] === targetLabel);

  // Start
  let current: Pt = { x: sx, y: sy };
  let backtrack: Pt = { x: sx - 1, y: sy }; // pixel to the left
  const boundary: Pt[] = [{ x: sx + 0.5, y: sy + 0.5 }];

  // helper to find neighbor index
  const nbIndex = (from: Pt, to: Pt) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    for (let i = 0; i < nb.length; i++) if (nb[i].x === dx && nb[i].y === dy) return i;
    return 0;
  };

  const maxSteps = w * h * 4;
  let secondPoint: Pt | null = null;

  for (let steps = 0; steps < maxSteps; steps++) {
    // start search from neighbor after backtrack (clockwise)
    const startIdx = (nbIndex(current, backtrack) + 1) % 8;

    let found: Pt | null = null;
    let foundBack: Pt | null = null;

    for (let k = 0; k < 8; k++) {
      const i = (startIdx + k) % 8;
      const nx = current.x + nb[i].x;
      const ny = current.y + nb[i].y;

      if (inside(nx, ny)) {
        found = { x: nx, y: ny };
        // new backtrack is the neighbor just before found (counter-clockwise)
        const bi = (i + 7) % 8;
        foundBack = { x: current.x + nb[bi].x, y: current.y + nb[bi].y };
        break;
      }
    }

    if (!found || !foundBack) break;

    backtrack = foundBack;
    current = found;
    boundary.push({ x: current.x + 0.5, y: current.y + 0.5 });

    if (!secondPoint) secondPoint = { ...current };

    // stop condition: returned to start and next would be second point
    if (current.x === sx && current.y === sy && boundary.length > 10) {
      break;
    }
  }

  if (boundary.length < 100) {
    throw new Error("Boundary tracing produced too few points. Use a clearer silhouette / higher contrast image.");
  }
  return boundary;
}

function resampleClosed(points: Pt[], M: number) {
  // Ensure closed
  const pts = points.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-6) pts.push({ ...first });

  const n = pts.length;
  const dist: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) dist[i] = dist[i - 1] + Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
  const total = dist[n - 1];

  const out: Pt[] = [];
  for (let k = 0; k < M; k++) {
    const target = (k / M) * total;
    let lo = 1, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dist[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const i = lo;
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.max(1e-9, dist[i] - dist[i - 1]);
    const t = (target - dist[i - 1]) / seg;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function computeCoefficients(z: Complex[], order: number) {
  const M = z.length;
  const coeffs: Complex[] = [];
  for (let n = -order; n <= order; n++) {
    let sum: Complex = { re: 0, im: 0 };
    for (let k = 0; k < M; k++) {
      const theta = -n * (2 * Math.PI * k / M);
      sum = cadd(sum, cmul(z[k], cexp(theta)));
    }
    coeffs.push(cscale(sum, 1 / M));
  }
  return coeffs;
}

function reconstruct(coeffs: Complex[], order: number, drawSamples: number) {
  const out: Complex[] = [];
  for (let i = 0; i < drawSamples; i++) {
    const t = (i / (drawSamples - 1)) * (2 * Math.PI);
    let sum: Complex = { re: 0, im: 0 };
    for (let n = -order; n <= order; n++) {
      const c = coeffs[n + order];
      sum = cadd(sum, cmul(c, cexp(n * t)));
    }
    out.push(sum);
  }
  return out;
}

export async function renderFourierFinalFromImage(
  ctx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
  img: HTMLImageElement,
  p: FourierFinalParams
) {
  const order = Math.max(1, Math.floor(p.order));
  const samples = Math.max(512, Math.floor(p.samples));
  const drawSamples = Math.max(1024, Math.floor(p.drawSamples));
  const downscaleW = Math.max(200, Math.floor(p.downscaleW));

  const { gray, w, h } = imageToGray(img, downscaleW);
  const thr = otsuThreshold(gray);

  let mask = buildMask(gray, thr);

  // Auto invert if foreground is huge (likely reversed)
  let ones = countOnes(mask);
  if (ones > mask.length * 0.75) {
    invertMask(mask);
    ones = countOnes(mask);
  }

  // Largest connected component
  let { labels, bestLabel, bestArea } = largestComponent(mask, w, h);

  // If still huge, likely wrong polarity; try invert and recompute
  if (bestArea > mask.length * 0.75) {
    invertMask(mask);
    const res = largestComponent(mask, w, h);
    labels = res.labels; bestLabel = res.bestLabel; bestArea = res.bestArea;
  }

  if (bestLabel === -1 || bestArea < 200) {
    throw new Error("Could not find a clear shape in the image. Use a higher-contrast silhouette.");
  }

  // Trace boundary of that component
  const boundary = traceBoundary(labels, w, h, bestLabel);
  const contour = resampleClosed(boundary, samples);

  // Center + convert to complex (flip Y)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of contour) {
    minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const z: Complex[] = contour.map((q) => ({ re: q.x - cx, im: -(q.y - cy) }));

  const coeffs = computeCoefficients(z, order);
  const rec = reconstruct(coeffs, order, drawSamples);

  // Bounds
  let rminX = Infinity, rmaxX = -Infinity, rminY = Infinity, rmaxY = -Infinity;
  for (const q of rec) {
    rminX = Math.min(rminX, q.re); rmaxX = Math.max(rmaxX, q.re);
    rminY = Math.min(rminY, q.im); rmaxY = Math.max(rmaxY, q.im);
  }
  const dx = Math.max(1e-9, rmaxX - rminX);
  const dy = Math.max(1e-9, rmaxY - rminY);

  const margin = Math.max(0, p.margin);
  const scale = Math.min(outW / (dx * (1 + margin)), outH / (dy * (1 + margin)));
  const ccx = (rminX + rmaxX) / 2;
  const ccy = (rminY + rmaxY) / 2;

  // draw
  ctx.clearRect(0, 0, outW, outH);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  // Rotate final image by 180° (user preference)
  ctx.scale(1, -1);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.98;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo((rec[0].re - ccx) * scale, (rec[0].im - ccy) * scale + p.centerY);
  for (let i = 1; i < rec.length; i++) {
    ctx.lineTo((rec[i].re - ccx) * scale, (rec[i].im - ccy) * scale + p.centerY);
  }
  ctx.stroke();
  ctx.restore();
}
