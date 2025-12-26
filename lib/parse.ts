export function parseNumberList(csv: string): number[] {
  const arr = csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
  if (arr.some((x) => !Number.isFinite(x))) throw new Error("Invalid number list.");
  return arr;
}
