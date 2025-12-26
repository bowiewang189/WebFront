"use client";

import { useMemo, useRef, useState } from "react";
import NumberField from "@/components/NumberField";
import { downloadCanvasPNG } from "@/lib/download";
import { renderSpiroFinal, type SpiroFinalParams } from "@/lib/templates/spiro";

export default function SpiroPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [bigRadius, setBigRadius] = useState(4);
  const [smallRadius, setSmallRadius] = useState(2);
  const [points, setPoints] = useState(16000);

  const [dFrac, setDFrac] = useState(1.0);
  const [phase, setPhase] = useState(0);

  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);

  const [err, setErr] = useState<string>("");

  const params: SpiroFinalParams = useMemo(
    () => ({
      bigRadius,
      smallRadius,
      points,
      dFrac,
      phase,
      centerY: 0,
      margin: 0.10,
      maxDen: 400,
      maxTurns: 200,
    }),
    [bigRadius, smallRadius, points, dFrac, phase]
  );

  function render() {
    setErr("");
    const c = canvasRef.current;
    if (!c) return;
    c.width = Math.max(200, Math.floor(width));
    c.height = Math.max(200, Math.floor(height));
    const ctx = c.getContext("2d");
    if (!ctx) return;

    try {
      renderSpiroFinal(ctx, c.width, c.height, params);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Rolling Circle Spirograph (Final Image)</h1>
          <a className="text-sm text-zinc-300 underline" href="/">← Back</a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm text-zinc-300">Parameters</div>
            <div className="mt-4 space-y-3">
              <NumberField label="big radius" value={bigRadius} setValue={setBigRadius} step={0.1} min={0.1} />
              <NumberField label="small radius" value={smallRadius} setValue={setSmallRadius} step={0.1} min={0.1} />
              <NumberField label="points (quality)" value={points} setValue={setPoints} step={500} min={500} />

              <div className="mt-3 pt-3 border-t border-zinc-800">
                <NumberField
                  label="dFrac (point distance / small radius)"
                  value={dFrac}
                  setValue={setDFrac}
                  step={0.05}
                  min={0.0}
                />
                <NumberField label="phase (radians)" value={phase} setValue={setPhase} step={0.1} />
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800">
                <NumberField label="Image width" value={width} setValue={setWidth} step={10} min={200} />
                <NumberField label="Image height" value={height} setValue={setHeight} step={10} min={200} />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={render}
                  className="rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-white"
                >
                  Render
                </button>
                <button
                  onClick={() => canvasRef.current && downloadCanvasPNG(canvasRef.current, "spiro.png")}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                >
                  Download PNG
                </button>
              </div>

              {err ? (
                <div className="text-sm text-red-300">Error: {err}</div>
              ) : (
                <div className="text-xs text-zinc-400">
                  Fixed: one arm. Turns are auto-chosen from big/small radius ratio (with safety caps).
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-auto rounded-xl bg-black" />
            <div className="mt-3 text-xs text-zinc-400">
              Click <b>Render</b> after changing parameters.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
