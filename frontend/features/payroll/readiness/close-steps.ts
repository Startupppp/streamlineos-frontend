export const CLOSE_STEP_KEYS = ["open", "checklist", "process", "compare", "approve", "pay", "release"] as const;

export type CloseStepKey = (typeof CLOSE_STEP_KEYS)[number];
export type CloseStepState = "done" | "current" | "locked";

export interface CloseStep {
  readonly key: CloseStepKey;
  readonly label: string;
  readonly state: CloseStepState;
  readonly lockedReason: string | null;
}

export interface CloseStepsInput {
  readonly runStatus: string | null;
  readonly openBlockers: number;
}

export const CLOSE_STEP_LABELS: Readonly<Record<CloseStepKey, string>> = {
  open: "Open month",
  checklist: "Checklist blockers",
  process: "Process",
  compare: "Compare",
  approve: "Approve & lock",
  pay: "Pay",
  release: "Release / Hold",
};

const LOCKED_REASONS: Readonly<Record<CloseStepKey, string>> = {
  open: "",
  checklist: "Create this month's run first",
  process: "Create this month's run first",
  compare: "Process payroll first",
  approve: "Process payroll first",
  pay: "Approve and lock the run first",
  release: "Pay the run first",
};

const CURRENT_BY_STATUS: Readonly<Record<string, number>> = {
  PREVIEW_READY: 4,
  PENDING_APPROVAL: 4,
  APPROVED: 4,
  LOCKED: 5,
  PAID: 6,
  PAYSLIPS_PUBLISHED: CLOSE_STEP_KEYS.length,
  CLOSED: CLOSE_STEP_KEYS.length,
};

function blockerReason(n: number): string {
  return `Clear ${n} open blocker${n === 1 ? "" : "s"} first`;
}

function currentIndex({ runStatus, openBlockers }: CloseStepsInput): number {
  if (runStatus === null) return 0;
  const progressed = CURRENT_BY_STATUS[runStatus];
  if (progressed !== undefined) return progressed;
  if (openBlockers > 0) return 1;
  if (runStatus === "EXCEPTIONS_FOUND") return 4;
  return 2;
}

export function deriveCloseSteps(input: CloseStepsInput): CloseStep[] {
  const current = currentIndex(input);
  return CLOSE_STEP_KEYS.map((key, index) => {
    const state: CloseStepState = index < current ? "done" : index === current ? "current" : "locked";
    const lockedReason =
      state !== "locked"
        ? null
        : key === "process" && input.runStatus !== null && input.openBlockers > 0
          ? blockerReason(input.openBlockers)
          : LOCKED_REASONS[key];
    return { key, label: CLOSE_STEP_LABELS[key], state, lockedReason };
  });
}

export function currentStepKey(steps: readonly CloseStep[]): CloseStepKey | null {
  return steps.find((step) => step.state === "current")?.key ?? null;
}
