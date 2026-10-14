export const ACCOUNT_COLORS: readonly string[] = [
  "#2563eb",
  "#22c55e",
  "#0ea5e9",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
];

export function accountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? "#3b82f6";
}
