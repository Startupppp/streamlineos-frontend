export type HrSetupStepId = "people" | "leave" | "shifts" | "documents";

export type HrSetupStepStatus = "done" | "next" | "todo" | "unknown";

export interface HrSetupSignals {
  people: number | null;
  leaveTypes: number | null;
  shifts: number | null;
  documents: number | null;
}

export interface HrSetupStep {
  id: HrSetupStepId;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  status: HrSetupStepStatus;
}

interface StepDefinition {
  id: HrSetupStepId;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  signal: keyof HrSetupSignals;
}

const STEP_DEFINITIONS: readonly StepDefinition[] = [
  {
    id: "people",
    title: "Add your people",
    description:
      "Everything else hangs off an employee record — approvals, balances and attendance all resolve through it.",
    href: "/hr/onboarding",
    actionLabel: "Add an employee",
    signal: "people",
  },
  {
    id: "leave",
    title: "Set up leave",
    description:
      "Create the leave types you actually grant — Casual, Sick and Earned cover most Indian SMBs — then a policy for each.",
    href: "/hr/settings/policies",
    actionLabel: "Configure leave",
    signal: "leaveTypes",
  },
  {
    // The step is named for a shift, its completion is counted in shifts, and
    // its button says "Create a shift" — but it linked to /hr/attendance, which
    // has no way to create one. Somebody following the checklist arrived at the
    // wrong screen and the step stayed incomplete however long they looked.
    // Renamed from "attendance" to match what it actually asks for.
    id: "shifts",
    title: "Define a shift",
    description:
      "A shift gives attendance something to measure against. You can record hours without any biometric hardware.",
    href: "/hr/shifts",
    actionLabel: "Create a shift",
    signal: "shifts",
  },
  {
    id: "documents",
    title: "Upload your documents",
    description:
      "Offer letters, ID proofs and policies live here, and expiry reminders start once something is filed.",
    href: "/hr/documents",
    actionLabel: "Upload a document",
    signal: "documents",
  },
];

export function hrStartHereSteps(signals: HrSetupSignals): HrSetupStep[] {
  let nextTaken = false;
  return STEP_DEFINITIONS.map((definition) => {
    const count = signals[definition.signal];
    const { signal: _signal, ...step } = definition;
    if (count === null) return { ...step, status: "unknown" as const };
    if (count > 0) return { ...step, status: "done" as const };
    if (!nextTaken) {
      nextTaken = true;
      return { ...step, status: "next" as const };
    }
    return { ...step, status: "todo" as const };
  });
}

export function hrSetupProgress(steps: readonly HrSetupStep[]): {
  done: number;
  known: number;
  complete: boolean;
} {
  const known = steps.filter((step) => step.status !== "unknown");
  const done = known.filter((step) => step.status === "done");
  return {
    done: done.length,
    known: known.length,
    complete: known.length > 0 && done.length === known.length,
  };
}
