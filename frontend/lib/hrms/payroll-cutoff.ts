import type { StatusTone } from "@/lib/design-tokens";

export const IST_TIME_ZONE = "Asia/Kolkata";

export type CutoffUrgency = "distant" | "warn" | "urgent" | "passed";

export interface PayrollCutoff {
  readonly title: string;
  readonly date: string;
}

export interface CutoffPresentation {
  readonly label: string;
  readonly daysRemaining: number;
  readonly urgency: CutoffUrgency;
  readonly tone: StatusTone;
}

const CUTOFF_TONE: Readonly<Record<CutoffUrgency, StatusTone>> = {
  distant: "info",
  warn: "warning",
  urgent: "danger",
  passed: "neutral",
};

export function formatIstDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

function istMidnight(value: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IST_TIME_ZONE,
  }).format(value);
  return Date.parse(`${parts}T00:00:00Z`);
}

export function cutoffUrgency(daysRemaining: number): CutoffUrgency {
  if (daysRemaining < 0) return "passed";
  if (daysRemaining <= 2) return "urgent";
  if (daysRemaining <= 5) return "warn";
  return "distant";
}

export function presentCutoff(
  cutoff: PayrollCutoff,
  now: Date = new Date(),
): CutoffPresentation | null {
  const target = new Date(cutoff.date);
  if (Number.isNaN(target.getTime())) return null;

  const daysRemaining = Math.round(
    (istMidnight(target) - istMidnight(now)) / 86_400_000,
  );
  const urgency = cutoffUrgency(daysRemaining);
  const suffix =
    urgency === "passed"
      ? "passed"
      : daysRemaining === 0
        ? "today"
        : `D-${daysRemaining}`;

  return {
    label: `${cutoff.title} · ${formatIstDate(target)} · ${suffix}`,
    daysRemaining,
    urgency,
    tone: CUTOFF_TONE[urgency],
  };
}
