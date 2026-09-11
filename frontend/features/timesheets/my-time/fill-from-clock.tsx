"use client";

import { format, parseISO } from "date-fns";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useDraftEntriesFromAttendance } from "@/hooks/api/timesheets-core/entries";
import type { AttendanceDraftResult } from "@/features/timesheets/types";

export interface FillFromClockProps {
  weekStart: string;
  weekEnd: string;
  onResult: (result: AttendanceDraftResult) => void;
}

/**
 * What the result actually says, rather than a number.
 *
 * The endpoint answers five things at once and they are not degrees of one
 * outcome. `enabled: false` means the organisation never switched the policy on
 * — nothing was read and nothing was written — so showing it as "0 entries
 * created" would tell somebody their clock produced no hours, which is a
 * different statement and a false one. Skipped days are not failures either:
 * `skippedExisting` is the whole reason the endpoint is safe to run twice.
 */
export function describeDraftResult(
  result: AttendanceDraftResult,
): { tone: "info" | "success" | "neutral"; headline: string; detail?: string } {
  if (!result.enabled) {
    return {
      tone: "info",
      headline: "Drafting from your clock is switched off for this organisation",
      detail: "Nothing was read and nothing was written. An administrator turns this on in timesheet settings.",
    };
  }
  if (result.segmentsFound === 0) {
    return { tone: "neutral", headline: "No completed clock days in this week" };
  }
  if (result.entriesCreated === 0) {
    /*
     * Segments were found and nothing was created, which is the case most
     * likely to read as a bug. It is usually the opposite — the days are
     * already logged — so it says which.
     */
    const reasons: string[] = [];
    if (result.skippedExisting > 0)
      reasons.push(`${result.skippedExisting} already had an entry`);
    if (result.skippedEmpty > 0)
      reasons.push(`${result.skippedEmpty} produced no usable hours`);
    return {
      tone: "neutral",
      headline: "Nothing new to draft",
      detail: reasons.length ? `Of the days clocked, ${reasons.join(" and ")}.` : undefined,
    };
  }

  const skipped: string[] = [];
  if (result.skippedExisting > 0) skipped.push(`${result.skippedExisting} already logged`);
  if (result.skippedEmpty > 0) skipped.push(`${result.skippedEmpty} with no usable hours`);
  return {
    tone: "success",
    headline:
      result.entriesCreated === 1
        ? "1 draft entry created from your clock"
        : `${result.entriesCreated} draft entries created from your clock`,
    detail: skipped.length ? `Skipped ${skipped.join(" and ")}.` : undefined,
  };
}

const TONE_CLASS: Record<"info" | "success" | "neutral", string> = {
  info: "border-status-info-rule bg-status-info-surface text-status-info-ink",
  success: "border-status-success-rule bg-status-success-surface text-status-success-ink",
  neutral: "border-status-neutral-rule bg-status-neutral-surface text-status-neutral-ink",
};

/**
 * Runs for the week already on screen rather than asking for a date range.
 *
 * The range is what the person is looking at, so there is nothing to choose and
 * nothing to get wrong — and it cannot exceed the endpoint's 62-day ceiling by
 * construction.
 *
 * The result is handed upward rather than held here: the button belongs in the
 * toolbar and the summary belongs under it, so one component cannot own both
 * without deciding the page's layout for it.
 */
export function FillFromClockButton({ weekStart, weekEnd, onResult }: FillFromClockProps) {
  const canCreate = useCan("timesheets:entries:create");
  const draft = useDraftEntriesFromAttendance();

  if (!canCreate) return null;

  return (
    <LoadingButton
      variant="outline"
      size="sm"
      className="gap-1.5"
      isPending={draft.isPending}
      onClick={() => {
        draft.mutate({ start: weekStart, end: weekEnd }, { onSuccess: onResult });
      }}
      aria-label={`Fill from clock for ${format(parseISO(weekStart), "d MMM")} to ${format(parseISO(weekEnd), "d MMM")}`}
    >
      Fill from clock
    </LoadingButton>
  );
}

export interface FillFromClockNoticeProps {
  result: AttendanceDraftResult | null;
}

export function FillFromClockNotice({ result }: FillFromClockNoticeProps) {
  if (!result) return null;
  const { tone, headline, detail } = describeDraftResult(result);

  return (
    <div role="status" className={`rounded-lg border px-4 py-3 ${TONE_CLASS[tone]}`}>
      <p className="text-sm font-medium">{headline}</p>
      {detail ? <p className="text-xs mt-0.5">{detail}</p> : null}
    </div>
  );
}
