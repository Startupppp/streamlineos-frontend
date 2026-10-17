import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { Worker, WorkerStatus } from "@/types/directory/workers";

const STATUS_TONE: Record<WorkerStatus, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  EXITED: "danger",
};

/**
 * A payee is an active payroll person. The worker update API accepts `isPayee`
 * and does not accept `status`, so an inactive payee is shown as active here.
 */
export function workerListStatus(worker: Pick<Worker, "status" | "isPayee">): {
  label: string;
  tone: BadgeTone;
} {
  if (worker.isPayee && worker.status !== "EXITED") {
    return { label: "Active", tone: "success" };
  }
  return {
    label: worker.status.charAt(0) + worker.status.slice(1).toLowerCase(),
    tone: STATUS_TONE[worker.status],
  };
}
