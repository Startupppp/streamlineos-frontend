export function formatReportHours(value: number): string {
  return `${value.toFixed(1)}h`;
}

export function formatReportPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function memberLabel(name: string | null, email: string | null): string {
  return name ?? email ?? "Unknown member";
}
