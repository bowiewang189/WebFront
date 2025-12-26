export default function NumberField({
  label,
  value,
  setValue,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <div className="text-sm text-zinc-200">{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
      />
    </label>
  );
}
