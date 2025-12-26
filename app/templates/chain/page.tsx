"use client";

import { useMemo, useRef, useState } from "react";
import NumberField from "@/components/NumberField";
import TextField from "@/components/TextField";
import { parseNumberList } from "@/lib/parse";
import { downloadCanvasPNG } from "@/lib/download";
import { renderChainFinal, type ChainFinalParams } from "@/lib/templates/chain";

export default function ChainPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [speedCsv, setSpeedCsv] = useState("-31,-19,17");
  const [lengthCsv, setLengthCsv] = useState("1.17,1.05,1.41");

  const [steps, setSteps] = useState(12000);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);

  const [err, setErr] = useState<string>("");

  const params: ChainFinalParams | null = useMemo(() => {
    try {
      const speedRatios = parseNumberList(speedCsv);
      const lengthRatios = parseNumberList(lengthCsv);
      if (speedRatios.length !== lengthRatios.length) {
        throw new Error("speed ratio count must match length ratio count.");
      }
      return { speedRatios, lengthRatios, steps, margin: 0.10 };
    } catch {
      return null;
    }
  }, [speedCsv, lengthCsv, steps]);

  function render() {
    setErr("");
    const c = canvasRef.current;
    if (!c) return;
    if (!params) {
      setErr("Invalid parameters. Check your speed/length ratios.");
      return;
    }
    c.width = Math.max(200, Math.floor(width));
    c.height = Math.max(200, Math.floor(height));
    const ctx = c.getContext("2d");
    if (!ctx) return;

    try {
      renderChainFinal(ctx, c.width, c.height, params);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Chain Ribbons (Final Image)</h1>
          <a className="text-sm text-zinc-300 underline" href="/">← Back</a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm text-zinc-300">Parameters</div>
            <div className="mt-4 space-y-3">
              <TextField
                label="Speed ratio (csv, signed)"
                value={speedCsv}
                setValue={setSpeedCsv}
                placeholder="-31,-19,17"
              />
              <TextField
                label="Length ratio (csv)"
                value={lengthCsv}
                setValue={setLengthCsv}
                placeholder="1.17,1.05,1.41"
              />

              <NumberField label="steps (quality)" value={steps} setValue={setSteps} step={500} min={500} />

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
                  onClick={() => canvasRef.current && downloadCanvasPNG(canvasRef.current, "chain.png")}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                >
                  Download PNG
                </button>
              </div>

              {err ? (
                <div className="text-sm text-red-300">Error: {err}</div>
              ) : (
                <div className="text-xs text-zinc-400">
                  Fixed: legs=1, ribbonMode=tip, maxLength=4, startTheta=π/2.
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
