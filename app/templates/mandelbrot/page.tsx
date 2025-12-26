"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadCanvasPNG } from "@/lib/download";
import { renderMandelbrotFinal } from "@/lib/templates/mandelbrot";

export default function MandelbrotPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Default: your saved zoom point (nice region)
  const [cx, setCx] = useState(-0.5503294068052128);
  const [cy, setCy] = useState(-0.6259345982965358);

  // Zoom control (button-driven)
  const [zoom, setZoom] = useState(250); // bigger = more zoom
  const zoomFactor = 1.6;

  // Max iterations (quality vs speed)
  const [maxIter, setMaxIter] = useState(700);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 1 });

  const OUT_W = 1920;
  const OUT_H = 1080;

  const params = useMemo(() => ({ cx, cy, zoom, maxIter }), [cx, cy, zoom, maxIter]);

  async function render() {
    setErr("");
    const c = canvasRef.current;
    if (!c) return;

    c.width = OUT_W;
    c.height = OUT_H;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    try {
      setBusy(true);
      setProgress({ done: 0, total: OUT_H });
      await renderMandelbrotFinal(ctx, OUT_W, OUT_H, params, (done, total) => setProgress({ done, total }));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  // Auto-render on cx/cy/zoom changes (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      render();
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, zoom, maxIter]);

  function clampZoom(z: number) {
    // Keep zoom >= 1 (no upper cap)
    return Math.max(1, Math.round(z));
  }

  function onZoomIn() {
    setZoom((z) => clampZoom(z * zoomFactor));
  }

  function onZoomOut() {
    setZoom((z) => clampZoom(z / zoomFactor));
  }

  function onReset() {
    setZoom(250);
    setCx(-0.5503294068052128);
    setCy(-0.6259345982965358);
  }

  // Click canvas to re-center at clicked point
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;

    const rect = c.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;   // 0..1
    const py = (e.clientY - rect.top) / rect.height;   // 0..1

    // Match lib/templates/mandelbrot.ts view model
    const viewW = 3.2 / zoom;
    const viewH = viewW * (OUT_H / OUT_W);

    const x0 = cx - viewW / 2;
    const y0 = cy - viewH / 2;

    const nx = x0 + px * viewW;
    const ny = y0 + py * viewH;

    setCx(nx);
    setCy(ny);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Mandelbrot (Final Image)</h1>
          <a className="text-sm text-zinc-300 underline" href="/">← Back</a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm text-zinc-300">Parameters</div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-400">x (center)</label>
                <input
                  type="number"
                  value={cx}
                  step={0.000001}
                  onChange={(e) => setCx(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">y (center)</label>
                <input
                  type="number"
                  value={cy}
                  step={0.000001}
                  onChange={(e) => setCy(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400">Zoom</div>
                  <div className="text-xs text-zinc-300">{zoom.toLocaleString()}</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={onZoomIn}
                    className="rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Zoom In
                  </button>
                  <button
                    disabled={busy}
                    onClick={onZoomOut}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Zoom Out
                  </button>
                  <button
                    disabled={busy}
                    onClick={onReset}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-zinc-500">
                  Tip: click on the image to re-center, then zoom in.
                </div>
              </div>

<div className="mt-4">
  <div className="flex items-center justify-between">
    <label className="text-xs text-zinc-400">Max iterations</label>
    <div className="text-xs text-zinc-300">{maxIter}</div>
  </div>
  <input
    type="range"
    min={50}
    max={3000}
    step={10}
    value={maxIter}
    onChange={(e) => setMaxIter(parseInt(e.target.value, 10))}
    className="mt-2 w-full"
  />
  <div className="mt-1 text-[11px] text-zinc-500">
    Higher iterations = more detail (slower), especially when zoomed in.
  </div>
</div>

              <div className="flex gap-2 pt-2">
                <button
                  disabled={busy}
                  onClick={render}
                  className="rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-60"
                >
                  {busy ? "Rendering..." : "Render"}
                </button>
                <button
                  onClick={() => canvasRef.current && downloadCanvasPNG(canvasRef.current, "mandelbrot.png")}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                >
                  Download PNG
                </button>
              </div>

              <div className="text-xs text-zinc-400">
                Fixed output: {OUT_W}×{OUT_H}. You can adjust max iterations.
              </div>

              {busy ? (
                <div className="text-xs text-zinc-400">
                  Progress: {progress.done}/{progress.total} rows
                </div>
              ) : null}

              {err ? <div className="text-sm text-red-300">Error: {err}</div> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <canvas
              ref={canvasRef}
              width={OUT_W}
              height={OUT_H}
              className="w-full h-auto rounded-xl bg-black cursor-crosshair"
              onClick={onCanvasClick}
            />
            <div className="mt-3 text-xs text-zinc-400">
              Change x/y or zoom buttons — it auto-renders. Click image to re-center.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
