import type { CycleStatus } from "@/types/projects";

export function nextCycleStatus(status: CycleStatus): CycleStatus {
  if (status === "draft") return "active";
  if (status === "active") return "completed";
  return "active";
}

export function statusActionLabel(status: CycleStatus): string {
  if (status === "draft") return "Start";
  if (status === "active") return "Complete";
  return "Reopen";
}
