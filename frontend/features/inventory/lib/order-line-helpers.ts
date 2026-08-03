export function toNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
