export type MandelbrotParams = {
  cx: number;      // center x
  cy: number;      // center y
  maxIter?: number;
  zoom?: number;   // bigger = more zoom
};

/**
 * Front-end Mandelbrot render (grayscale white-on-black).
 * No backend. Chunked rows to keep UI responsive.
 */
export async function renderMandelbrotFinal(
  ctx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
  p: MandelbrotParams,
  onProgress?: (doneRows: number, totalRows: number) => void
) {
  const cx = Number(p.cx);
  const cy = Number(p.cy);
  const maxIter = Math.max(50, Math.min(4000, Math.floor(p.maxIter ?? 700)));
  const zoom = Math.max(1, Number(p.zoom ?? 250));

  // View window: classic Mandelbrot spans about width ~3.2 at zoom=1
  const viewW = 3.2 / zoom;
  const viewH = viewW * (outH / outW);

  // Precompute
  const x0 = cx - viewW / 2;
  const y0 = cy - viewH / 2;

  // Prepare image buffer
  const img = ctx.createImageData(outW, outH);
  const data = img.data;

  // Background
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }

  // Escape-time coloring (smooth)
  const log2 = Math.log(2);
  const gamma = 0.9;

  const chunkRows = 16; // yield every N rows
  for (let py = 0; py < outH; py++) {
    const y = y0 + (py / (outH - 1)) * viewH;

    for (let px = 0; px < outW; px++) {
      const x = x0 + (px / (outW - 1)) * viewW;

      // Iterate z_{n+1} = z_n^2 + c
      let zx = 0, zy = 0;
      let iter = 0;

      // quick cardioid / bulb test could be added, but keep simple/accurate
      while (iter < maxIter) {
        const zx2 = zx * zx - zy * zy + x;
        const zy2 = 2 * zx * zy + y;
        zx = zx2; zy = zy2;

        if (zx * zx + zy * zy > 4) break;
        iter++;
      }

      const idx = (py * outW + px) * 4;

      if (iter >= maxIter) {
        // inside set -> black
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        continue;
      }

      // Smooth iteration count
      const r2 = zx * zx + zy * zy;
      const mu = iter + 1 - Math.log(Math.log(Math.sqrt(r2))) / log2;

      // Map to brightness: near boundary -> brighter
      let v = 1.0 - mu / maxIter;
      v = Math.max(0, Math.min(1, v));
      v = Math.pow(v, gamma);

      const c255 = Math.floor(v * 255);
      data[idx] = c255;
      data[idx + 1] = c255;
      data[idx + 2] = c255;
    }

    if (onProgress) onProgress(py + 1, outH);

    if ((py + 1) % chunkRows === 0) {
      // yield to UI
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  ctx.putImageData(img, 0, 0);
}
