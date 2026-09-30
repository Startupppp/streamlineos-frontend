"use client";

import { AlertCircle } from "lucide-react";
import { useSeatInfo } from "@/hooks/api/subscription";

/**
 * BUG-HRMS-008. How many seats are actually free, said before the invite is sent.
 *
 * A pending invitation reserves a seat, and an onboarded employee is admitted as a
 * member, so a ten-seat plan with one owner and nine pending invites is full — and
 * the invite dialog showed nothing about it. QA sent a bulk invite, watched it
 * queue 8 of 10 and then name failures, and only found the ceiling in Billing
 * afterwards.
 *
 * Renders nothing on an unlimited plan, and nothing for a viewer who cannot read
 * billing — a read they are not allowed is not a number to guess at.
 */
export function InviteSeatNotice({ requesting }: { requesting?: number }) {
  const { data: seats } = useSeatInfo();
  if (!seats || seats.available === null) return null;

  const { available } = seats;
  const shortBy = requesting === undefined ? 0 : requesting - available;
  const tone =
    available === 0 || shortBy > 0
      ? "border-status-danger-rule bg-status-danger-surface text-status-danger-ink"
      : "border-status-info-rule bg-status-info-surface text-status-info-ink";

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {available === 0
          ? `No seats are free on your plan${seats.total === null ? "" : ` (${String(seats.total)} in use)`}.`
          : `${String(available)} of ${String(seats.total ?? available)} seats free.`}{" "}
        {shortBy > 0
          ? `This invite needs ${String(requesting)}, so ${String(shortBy)} will be refused. `
          : ""}
        A pending invitation holds a seat until it is accepted, declined or cancelled.
      </span>
    </div>
  );
}
