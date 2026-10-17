export interface MyLeaveDecision {
  id: number;
  status: string;
  startDate: string;
  leaveTypeName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const DECIDED = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

export function latestLeaveDecision(rows: readonly unknown[]): MyLeaveDecision | null {
  let latest: MyLeaveDecision | null = null;
  for (const raw of rows) {
    if (!isRecord(raw)) continue;
    const id = Number(raw.id);
    const status = typeof raw.status === "string" ? raw.status : "";
    if (!Number.isFinite(id) || !DECIDED.has(status)) continue;
    const leaveType = isRecord(raw.leaveType) ? raw.leaveType : null;
    const decision: MyLeaveDecision = {
      id,
      status,
      startDate: String(raw.startDate ?? ""),
      leaveTypeName: leaveType && typeof leaveType.name === "string" ? leaveType.name : "Leave",
    };
    if (!latest || decision.id > latest.id) latest = decision;
  }
  return latest;
}
