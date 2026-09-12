"use client";

import { Info } from "lucide-react";
import { formatShortDate } from "@/lib/date-utils";
import type { GlReconReport } from "@/hooks/api/inventory/gl-reconciliation";

/**
 * The three things a row cannot say for itself.
 *
 * The backend says out loud when accounting is not installed rather than
 * implying it with a page of zeroes, and it names the source types that are
 * deliberately never posted. Dropping either would leave a tenant with no
 * accounting module reading an alarming report about a gap they do not have.
 * Orphan journals are the mirror image — a journal entry naming an inventory
 * source that produced no movement.
 */
export function GlReconciliationNotes({ report }: { report: GlReconReport | undefined }) {
  if (report === undefined) return null;

  const hasUnposted = report.unpostedByDesign.length > 0;
  const hasOrphans = report.orphanJournals.length > 0;
  if (report.accounting.note === null && !hasUnposted && !hasOrphans) return null;

  return (
    <div className="shrink-0 space-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
      {report.accounting.note === null ? null : (
        <p className="flex items-start gap-2 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {report.accounting.note}
        </p>
      )}

      {hasUnposted ? (
        <div>
          <p className="text-sm font-semibold">Never posted, by design</p>
          <ul className="mt-1 space-y-0.5">
            {report.unpostedByDesign.map((entry) => (
              <li key={entry.sourceType} className="text-dense text-muted-foreground">
                {entry.sourceType} — {entry.movementCount}{" "}
                {entry.movementCount === 1 ? "movement" : "movements"}, value {entry.movementValue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasOrphans ? (
        <div>
          <p className="text-sm font-semibold">Journal entries with no inventory movement</p>
          <ul className="mt-1 space-y-0.5">
            {report.orphanJournals.map((entry) => (
              <li key={entry.journalEntryId} className="text-dense text-muted-foreground">
                {entry.journalEntryNumber} · {formatShortDate(entry.journalEntryDate)} ·{" "}
                {entry.sourceType} · {entry.journalStatus} · {entry.journalValue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
