"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMinorMoney } from "@/lib/accounting/money";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ReconciliationBannerProps {
  ok: boolean;
  differenceMinor: number;
  currency: string;
  okTitle: string;
  failTitle: string;
  failDescription: string;
  differenceLabel?: string;
  className?: string;
}

export function ReconciliationBanner({
  ok,
  differenceMinor,
  currency,
  okTitle,
  failTitle,
  failDescription,
  differenceLabel = "The two sides differ by",
  className,
}: ReconciliationBannerProps) {
  const tone = statusToneClasses(ok ? "success" : "danger");

  return (
    <div
      role={ok ? undefined : "alert"}
      className={cn(
        "flex shrink-0 items-start gap-3 rounded-xl border p-4",
        tone.surface,
        tone.rule,
        className,
      )}
    >
      {ok ? (
        <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", tone.ink)} aria-hidden />
      ) : (
        <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", tone.ink)} aria-hidden />
      )}
      <div className="min-w-0 space-y-1">
        <p className={cn("text-sm font-semibold", tone.ink)}>{ok ? okTitle : failTitle}</p>
        {!ok ? (
          <>
            <p className="text-label text-foreground/80">{failDescription}</p>
            <p className="font-mono text-label font-semibold tabular-nums text-foreground">
              {differenceLabel} {formatMinorMoney(Math.abs(differenceMinor), currency)}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
