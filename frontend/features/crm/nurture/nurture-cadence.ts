import {
  MAX_STEP_WAIT_HOURS,
  MIN_STEP_WAIT_HOURS,
  type NurtureStep,
} from "@/types/crm/nurture";

/**
 * What the server will actually store, worked out before it is asked.
 *
 * `NurtureSequencesService.replaceSteps` clamps every wait on the way in and
 * `waitMsForStep` clamps again on the way out, so a cadence typed as 24 hours
 * is silently run at 240. Mirroring the clamp here is the difference between an
 * editor that shows what will happen and one that shows what was typed — and
 * the second kind produces a sequence somebody believes is weekly.
 *
 * The rule is copied rather than fetched because nothing publishes it; the risk
 * that carries is recorded on `MIN_STEP_WAIT_HOURS` in `types/crm/nurture.ts`.
 */
export function clampWaitHours(hours: number): number {
  if (!Number.isFinite(hours)) return MIN_STEP_WAIT_HOURS;
  return Math.min(MAX_STEP_WAIT_HOURS, Math.max(MIN_STEP_WAIT_HOURS, Math.floor(hours)));
}

/** Hours as a person reads them: "10 days", "10 days 6 hours", "18 hours". */
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

/**
 * Why the number they typed is not the number that will run, or null when it is.
 *
 * Said as a consequence rather than as a constraint. "Minimum 240" reads as
 * arbitrary; "a tighter cadence pays for a draft the guardrails then refuse" is
 * the reason the floor exists, and it is the sentence that stops somebody
 * raising a ticket about the field ignoring them.
 */
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

/**
 * When each step comes due, counted from enrolment.
 *
 * A per-step wait tells you nothing about whether the cadence is four months
 * long, and four months is exactly the length the step ceiling was chosen to
 * allow. The offsets are cumulative over the CLAMPED waits, because that is the
 * schedule the sender keeps.
 */
export function cadenceOffsetsHours(steps: readonly { waitHours: number }[]): number[] {
  const offsets: number[] = [];
  let total = 0;

  for (const step of steps) {
    total += clampWaitHours(step.waitHours);
    offsets.push(total);
  }

  return offsets;
}

/** How long the whole cadence runs, as the sender will run it. */
export function cadenceLengthHours(steps: readonly { waitHours: number }[]): number {
  const offsets = cadenceOffsetsHours(steps);
  return offsets.length === 0 ? 0 : (offsets[offsets.length - 1] ?? 0);
}

/**
 * Stored steps as the editor's fields.
 *
 * Ordered by `stepNumber` rather than trusted in arrival order: the server
 * derives numbering from the array it is sent, so an editor seeded out of order
 * would renumber the cadence on the next save.
 */
export function stepsToFields(steps: readonly NurtureStep[]): { waitHours: string }[] {
  return [...steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step) => ({ waitHours: String(step.waitHours) }));
}
