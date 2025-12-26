"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadCanvasPNG } from "@/lib/download";
import { renderFourierFinalFromImage } from "@/lib/templates/fourier";

export default function FourierPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [imgURL, setImgURL] = useState<string>("");

  const [order, setOrder] = useState(40);

  // ✅ expose output size
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);

  const [err, setErr] = useState<string>("");

  const params = useMemo(
    () => ({
      order,
      samples: 2048,
      drawSamples: 7000,
      margin: 0.02,
      centerY: 0,
      downscaleW: 360,
    }),
    [order]
  );

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr("");
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const url = URL.createObjectURL(f);
    setImgURL(url);
  }

  function clampInt(v: number, min: number, max: number) {
    const n = Math.floor(Number.isFinite(v) ? v : min);
    return Math.max(min, Math.min(max, n));
  }

  async function render() {
    setErr("");
    const c = canvasRef.current;
    const img = imgRef.current;

    if (!c) return;
    if (!imgURL || !img) {
      setErr("Please choose an image first.");
      return;
    }

    const W = clampInt(width, 200, 8000);
    const H = clampInt(height, 200, 8000);
    c.width = W;
    c.height = H;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    try {
      await renderFourierFinalFromImage(ctx, c.width, c.height, img, params);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }
// Auto-render when Order changes (debounced), once an image is selected.
useEffect(() => {
  if (!imgURL) return;
  // Debounce so dragging the slider doesn't render on every tiny move.
  const t = window.setTimeout(() => {
    render();
  }, 150);
  return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [order, imgURL]);


  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Fourier Image (Final Curve)</h1>
          <a className="text-sm text-zinc-300 underline" href="/">← Back</a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm text-zinc-300">Parameters</div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-400">Image</label>
                <input type="file" accept="image/*" onChange={onPickFile} className="mt-1 w-full text-sm" />
                <div className="mt-1 text-xs text-zinc-400">
                  {fileName
                    ? `Selected: ${fileName}`
                    : "Choose a high-contrast silhouette (dark shape on light background)."}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-400">Order (N)</label>
                  <div className="text-xs text-zinc-300">{order}</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={80}
                  step={1}
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value, 10))}
                  className="mt-2 w-full"
                />
                <div className="mt-1 text-[11px] text-zinc-500">
                  Lower = smoother, higher = more detail (slower).
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-400">Output size (pixels)</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-zinc-500">Width</div>
                    <input
                      type="number"
                      value={width}
                      min={200}
                      max={8000}
                      step={10}
                      onChange={(e) => setWidth(parseInt(e.target.value || "0", 10))}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500">Height</div>
                    <input
                      type="number"
                      value={height}
                      min={200}
                      max={8000}
                      step={10}
                      onChange={(e) => setHeight(parseInt(e.target.value || "0", 10))}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-zinc-500">
                  Tip: 1920×1080 for YouTube, 3840×2160 for 4K.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={render}
                  className="rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-white"
                >
                  Render
                </button>
                <button
                  onClick={() => canvasRef.current && downloadCanvasPNG(canvasRef.current, "fourier.png")}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                >
                  Download PNG
                </button>
              </div>

              {err ? <div className="text-sm text-red-300">Error: {err}</div> : null}

              <div className="text-xs text-zinc-400">
                Output: {width}×{height}. Longest contour is used if multiple shapes exist.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            {imgURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={imgURL} alt="input" className="hidden" />
            ) : null}

            <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-auto rounded-xl bg-black" />
            <div className="mt-3 text-xs text-zinc-400">
              Upload an image, then move <b>Order</b> slider — it will auto-render. (You can still click <b>Render</b>.)
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
