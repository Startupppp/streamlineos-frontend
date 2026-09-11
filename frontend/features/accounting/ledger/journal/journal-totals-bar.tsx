"use client";

import { formatMinorMoney } from "@/lib/accounting/money";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { JournalTotals } from "./journal-totals";

interface JournalTotalsBarProps {
  totals: JournalTotals;
  currency: string;
}

export function JournalTotalsBar({ totals, currency }: JournalTotalsBarProps) {
  const tone = statusToneClasses(totals.balanced ? "success" : "warning");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
        tone.surface,
        tone.rule,
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-label tabular-nums">
        <span>
          <span className="text-muted-foreground">Debits</span>{" "}
          <span className="font-semibold">{formatMinorMoney(totals.debitMinor, currency)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Credits</span>{" "}
          <span className="font-semibold">{formatMinorMoney(totals.creditMinor, currency)}</span>
        </span>
      </div>
      <p className={cn("text-label font-semibold", tone.ink)}>
        {totals.balanced
          ? "This entry balances."
          : `Out by ${formatMinorMoney(Math.abs(totals.differenceMinor), currency)} — the two sides must match before it can be posted.`}
      </p>
    </div>
  );
}
