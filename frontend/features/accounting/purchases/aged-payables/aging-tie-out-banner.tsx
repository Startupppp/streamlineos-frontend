"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatMoney } from "@/lib/accounting/money";
import { useApLedgerTieOut } from "@/hooks/api/accounting/ap";

interface AgingTieOutBannerProps {
  asOf: string;
}

const dangerTone = statusToneClasses("danger");
const successTone = statusToneClasses("success");

export function AgingTieOutBanner({ asOf }: AgingTieOutBannerProps) {
  const tieOutQuery = useApLedgerTieOut(asOf);

  if (tieOutQuery.isPending || tieOutQuery.isError || !tieOutQuery.data) return null;

  const tieOut = tieOutQuery.data;
  const tone = tieOut.reconciles ? successTone : dangerTone;

  return (
    <div
      className={cn(
        "mb-2 flex shrink-0 items-start gap-2 rounded-xl border px-4 py-3 text-label",
        tone.surface,
        tone.ink,
        tone.rule,
      )}
      role={tieOut.reconciles ? undefined : "alert"}
    >
      {tieOut.reconciles ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0">
        {tieOut.reconciles ? (
          <p>
            This adds up to what the books say you owe:{" "}
            <span className="font-mono tabular-nums">
              {formatMoney(tieOut.controlAccountBalanceMinor, tieOut.currency)}
            </span>
            .
          </p>
        ) : (
          <>
            <p className="font-medium">
              These figures do not agree with the books. Do not pay from this list until it is
              fixed.
            </p>
            <p className="mt-0.5">
              The unpaid bills add up to{" "}
              <span className="font-mono tabular-nums">
                {formatMoney(tieOut.totalOpenMinor, tieOut.currency)}
              </span>
              , the books say{" "}
              <span className="font-mono tabular-nums">
                {formatMoney(tieOut.controlAccountBalanceMinor, tieOut.currency)}
              </span>
              , a gap of{" "}
              <span className="font-mono tabular-nums">
                {formatMoney(tieOut.differenceMinor, tieOut.currency)}
              </span>
              .
            </p>
          </>
        )}
        {tieOut.notes.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {tieOut.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
