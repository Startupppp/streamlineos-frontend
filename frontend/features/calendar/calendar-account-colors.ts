export const ACCOUNT_COLORS: readonly string[] = [
  "#a855f7",
  "#22c55e",
  "#0ea5e9",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
];

export function accountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? "#3b82f6";
}
