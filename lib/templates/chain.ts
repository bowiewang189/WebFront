export type ChainFinalParams = {
  speedRatios: number[];   // signed ratios, e.g. -31,-19,17
  lengthRatios: number[];  // positive ratios, e.g. 1.17,1.05,1.41
  steps: number;           // samples
  centerY: number;         // move down
  margin: number;          // padding
};

type Pt = { x: number; y: number };

function cumsumSegments(segs: Pt[]): Pt[] {
  const out: Pt[] = [];
  let x = 0, y = 0;
  for (const s of segs) {
    x += s.x;
    y += s.y;
    out.push({ x, y });
  }
  return out;
}

/**
 * Chain Ribbons (final image)
 * - fixed: legs=1
 * - fixed: startTheta = π/2
 * - fixed: maxLength = 4.0
 * - fixed: ribbonMode = tip (end-effector path)
 */
export function renderChainFinal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ChainFinalParams
) {
  const n = p.speedRatios.length;
  if (p.lengthRatios.length !== n) throw new Error("speedRatios and lengthRatios must have same length.");
  if (p.steps < 200) throw new Error("steps too small (>=200 recommended).");
  if (p.lengthRatios.some((x) => !(x > 0))) throw new Error("lengthRatios must be > 0.");
  if (p.speedRatios.some((x) => !Number.isFinite(x))) throw new Error("Invalid speedRatios value.");

  const startTheta = Math.PI * 0.5;
  const maxLength = 4.0;

  // Split signed speedRatios into SR (abs) + DI (sign)
  const SR = p.speedRatios.map((v) => Math.abs(v));
  const DI = p.speedRatios.map((v) => (v >= 0 ? 1 : -1));

  // Normalize lengths to maxLength
  const sumL = p.lengthRatios.reduce((a, b) => a + b, 0);
  const scaleL = maxLength / (sumL || 1);
  const L = p.lengthRatios.map((v) => v * scaleL);

  const tipTrack: Pt[] = [];

  const BASE = 1;

  for (let si = 0; si < p.steps; si++) {
    const t = si / (p.steps - 1); // 0..1
    const segs: Pt[] = [];
    for (let j = 0; j < n; j++) {
      const ang = DI[j] * (SR[j] * BASE * Math.PI * 2) * t + startTheta;
      segs.push({ x: L[j] * Math.cos(ang), y: L[j] * Math.sin(ang) });
    }
    const joints = cumsumSegments(segs).map((pt) => ({ x: pt.x, y: pt.y + p.centerY }));
    tipTrack.push(joints[joints.length - 1]);
  }

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of tipTrack) {
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

  // Background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // Draw tip polyline (WHITE)
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.95;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo((tipTrack[0].x - cx) * scale, (tipTrack[0].y - cy) * scale);
  for (let i = 1; i < tipTrack.length; i++) {
    ctx.lineTo((tipTrack[i].x - cx) * scale, (tipTrack[i].y - cy) * scale);
  }
  ctx.stroke();

  ctx.restore();
}
