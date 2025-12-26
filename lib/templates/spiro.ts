export type SpiroFinalParams = {
  bigRadius: number;
  smallRadius: number;
  points: number;      // sample points
  dFrac: number;       // point distance = dFrac * smallRadius
  phase: number;       // radians
  centerY: number;
  margin: number;
  maxDen: number;      // rational approx max denominator for auto-close
  maxTurns: number;    // safety cap
};

function hypotrochoidPoint(R: number, r: number, d: number, t: number, phase: number) {
  const k = (R - r) / r;
  const x = (R - r) * Math.cos(t) + d * Math.cos(k * t + phase);
  const y = (R - r) * Math.sin(t) - d * Math.sin(k * t + phase);
  return { x, y };
}

function gcdInt(a: number, b: number) {
  a = Math.abs(a); b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b; b = t;
  }
  return a;
}

// Continued-fraction rational approximation for x, with denom <= maxDen
function rationalApprox(x: number, maxDen: number): { p: number; q: number } {
  if (!Number.isFinite(x)) return { p: 1, q: 1 };
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  if (x === 0) return { p: 0, q: 1 };

  let a0 = Math.floor(x);
  let p0 = 1, q0 = 0;
  let p1 = a0, q1 = 1;

  let frac = x - a0;
  let iter = 0;
  while (iter++ < 40 && frac > 1e-12) {
    const a = Math.floor(1 / frac);
    const p2 = a * p1 + p0;
    const q2 = a * q1 + q0;
    if (q2 > maxDen) break;
    p0 = p1; q0 = q1;
    p1 = p2; q1 = q2;
    frac = 1 / frac - a;
  }
  return { p: sign * p1, q: q1 };
}

function autoTurns(R: number, r: number, maxDen: number, maxTurns: number) {
  const ratio = R / r;
  const { p, q } = rationalApprox(ratio, Math.max(1, maxDen));
  const pp = Math.abs(p);
  const qq = Math.max(1, q);
  const g = gcdInt(pp - qq, qq) || 1;
  const turns = Math.min(Math.max(1, Math.floor(qq / g)), Math.max(1, maxTurns));
  return turns;
}

export function renderSpiroFinal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: SpiroFinalParams
) {
  const R = p.bigRadius;
  const r = p.smallRadius;
  if (R <= 0 || r <= 0) throw new Error("big radius / small radius must be > 0.");
  if (p.points < 200) throw new Error("points too small (>=200 recommended).");

  const turns = autoTurns(R, r, p.maxDen, p.maxTurns);
  const tMax = Math.PI * 2 * turns;

  const trail: { x: number; y: number }[] = [];
  const d = p.dFrac * r;

  for (let i = 0; i < p.points; i++) {
    const t = (i / (p.points - 1)) * tMax;
    const pt = hypotrochoidPoint(R, r, d, t, p.phase);
    trail.push({ x: pt.x, y: pt.y + p.centerY });
  }

  // bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of trail) {
    if (q.x < minX) minX = q.x;
    if (q.x > maxX) maxX = q.x;
    if (q.y < minY) minY = q.y;
    if (q.y > maxY) maxY = q.y;
  }
  const dx = Math.max(1e-9, maxX - minX);
  const dy = Math.max(1e-9, maxY - minY);
  const pad = 1 + Math.max(0, p.margin);
  const scale = Math.min(w / (dx * pad), h / (dy * pad));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // draw (WHITE)
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.95;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo((trail[0].x - cx) * scale, (trail[0].y - cy) * scale);
  for (let i = 1; i < trail.length; i++) {
    ctx.lineTo((trail[i].x - cx) * scale, (trail[i].y - cy) * scale);
  }
  ctx.stroke();

  ctx.restore();
}
