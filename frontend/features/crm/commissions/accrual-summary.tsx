"use client";

import { AlertTriangle, Coins, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { CommissionAccrual } from "@/types/crm/commission";
import { formatMinor } from "@/lib/pricing-format";
import {
  formatBps,
  formatPeriodRange,
} from "./commission-format";

interface AccrualSummaryProps {
  accrual: CommissionAccrual;
  locale: string;
}

/**
 * The headline figure, and an honest statement of whether it is fully explained.
 *
 * `reconciles` travels in the payload precisely so a screen showing a total
 * beside a breakdown can assert the two agree rather than implying it by
 * placing them next to each other. When it is false the notice below says so in
 * the same view as the number — a rep who cannot reconcile their own commission
 * should learn that from the screen, not from adding the rows up themselves and
 * finding a gap.
 */
export function AccrualSummary({ accrual, locale }: AccrualSummaryProps) {
  const reconciled = accrual.reconciles.byDeal && accrual.reconciles.byRule;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Accrued this period"
          value={formatMinor(accrual.amountMinor, accrual.currency, locale)}
          icon={Coins}
          tone="emerald"
          featured
          hint={formatPeriodRange(accrual.periodStart, accrual.periodEnd, locale)}
        />
        <StatCard
          label="Basis"
          value={formatMinor(accrual.basisMinor, accrual.currency, locale)}
          icon={TrendingUp}
          hint="What the rate was applied to"
        />
        <StatCard
          label="Attainment"
          value={formatBps(accrual.attainmentBps)}
          icon={Target}
          hint={
            accrual.attainmentBps === null
              ? "This plan has no quota"
              : "Against the quota in force"
          }
        />
        <StatCard
          label="Deals"
          value={accrual.dealCount}
          hint={`${accrual.partCount} rule ${accrual.partCount === 1 ? "band" : "bands"}`}
        />
      </div>

      {accrual.truncated ? (
        <Notice
          title="This period is too large to itemise in one view"
          body={`The figure above covers the whole period. The breakdown below accounts for ${accrual.itemisedPartCount} of ${accrual.partCount} bands — narrow by plan, or open a single deal, to see the rest.`}
        />
      ) : null}

      {!reconciled && !accrual.truncated ? (
        <Notice
          title="The breakdown does not add up to the total"
          body="The stored decomposition for this period no longer sums to the accrued figure. The total is correct; the itemisation is not. Rebuilding the accrual for this range will re-derive the parts."
        />
      ) : null}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
