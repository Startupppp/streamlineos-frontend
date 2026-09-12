export interface RawLeaveTrendsRow {
  month: unknown | null;
  leave_type: unknown | null;
  days: unknown | null;
}

export interface RawLeaveTrendsResponse {
  trends?: RawLeaveTrendsRow[];
  byTypeAndMonth?: { month: string; leaveTypeName: string; days: number }[];
  totalByType?: { leaveTypeName: string; days: number }[];
}

export interface HrLeaveTrendsData {
  byTypeAndMonth: { month: string; leaveTypeName: string; days: number }[];
  totalByType: { leaveTypeName: string; days: number }[];
}

export function normalizeLeaveTrends(raw: RawLeaveTrendsResponse): HrLeaveTrendsData {
  if (Array.isArray(raw.byTypeAndMonth)) {
    return {
      byTypeAndMonth: raw.byTypeAndMonth,
      totalByType: raw.totalByType ?? [],
    };
  }

  const rows: RawLeaveTrendsRow[] = Array.isArray(raw.trends) ? raw.trends : [];

  const byTypeAndMonth = rows.map((r) => ({
    month: String(r.month ?? ""),
    leaveTypeName: String(r.leave_type ?? ""),
    days: Number(r.days ?? 0),
  }));

  const totalsMap = new Map<string, number>();
  for (const r of byTypeAndMonth) {
    totalsMap.set(r.leaveTypeName, (totalsMap.get(r.leaveTypeName) ?? 0) + r.days);
  }
  const totalByType = Array.from(totalsMap.entries()).map(([leaveTypeName, days]) => ({
    leaveTypeName,
    days,
  }));

  return { byTypeAndMonth, totalByType };
}
