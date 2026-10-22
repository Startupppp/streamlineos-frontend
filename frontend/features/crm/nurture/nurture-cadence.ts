import {
  MAX_STEP_WAIT_HOURS,
  MIN_STEP_WAIT_HOURS,
  type NurtureStep,
} from "@/types/crm/nurture";

export function clampWaitHours(hours: number): number {
  if (!Number.isFinite(hours)) return MIN_STEP_WAIT_HOURS;
  return Math.min(MAX_STEP_WAIT_HOURS, Math.max(MIN_STEP_WAIT_HOURS, Math.floor(hours)));
}

export function describeWaitHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "no wait";

  const whole = Math.floor(hours);
  const days = Math.floor(whole / 24);
  const rest = whole % 24;

  const dayPart = days === 1 ? "1 day" : `${days} days`;
  const hourPart = rest === 1 ? "1 hour" : `${rest} hours`;

  if (days === 0) return hourPart;
  if (rest === 0) return dayPart;
  return `${dayPart} ${hourPart}`;
}

export function clampNoticeFor(hours: number): string | null {
  if (!Number.isFinite(hours)) return null;

  const clamped = clampWaitHours(hours);
  if (clamped === hours) return null;

  if (hours < MIN_STEP_WAIT_HOURS)
    return `Runs at ${describeWaitHours(clamped)}. Anything tighter is refused at send time by the contact limits, so it would be drafted and never sent.`;

  if (hours > MAX_STEP_WAIT_HOURS)
    return `Runs at ${describeWaitHours(clamped)}, the longest a follow-up may wait.`;

  return `Runs at ${describeWaitHours(clamped)}.`;
}

export function cadenceOffsetsHours(steps: readonly { waitHours: number }[]): number[] {
  const offsets: number[] = [];
  let total = 0;

  for (const step of steps) {
    total += clampWaitHours(step.waitHours);
    offsets.push(total);
  }

  return offsets;
}

export function cadenceLengthHours(steps: readonly { waitHours: number }[]): number {
  const offsets = cadenceOffsetsHours(steps);
  return offsets.length === 0 ? 0 : (offsets[offsets.length - 1] ?? 0);
}

export function stepsToFields(steps: readonly NurtureStep[]): { waitHours: string }[] {
  return [...steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step) => ({ waitHours: String(step.waitHours) }));
}
