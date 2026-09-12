"use client";

import { useCallback, useState } from "react";
import { TrendingUp, Target, Layers } from "lucide-react";
import { XIcon, CheckIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { formatMoneyCompact } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useForecastSnapshots, useOverrideForecast } from "@/hooks/api/crm/deals";
import { useDealForecast } from "@/hooks/api/crm/deal-forecast";
import { ForecastBasisCard } from "./forecast-basis-card";
import { useOrgDisplay } from "@/hooks/api/org-display";

/**
 * CRM-P2-04. The forecast, read from the server that computes it.
 *
 * What this replaced: a `useMemo` over the first hundred deals on the page,
 * weighting each one by a six-entry `STAGE_PROBABILITY` table hardcoded in this
 * file. Three things were wrong with that beyond the obvious. It was not the
 * tenant's table, so an organisation whose pipeline runs LEAD → QUALIFYING →
 * PILOT weighted every deal at zero. It was capped at one page, so the "total"
 * pipeline of a workspace with three hundred open deals was the total of a
 * hundred of them. And it could never reflect anything learned, because the
 * arithmetic lived in the browser and the model lives in the database.
 *
 * `GET /deals/forecast` has computed all of this — over every open deal, using
 * the tenant's own stage configuration, and now weighted by the learned model
 * where one has earned acceptance — and had no caller. `queryKeys.deals.forecast`
 * existed and five mutations invalidated it; nothing read it.
 *
 * The "Commit Forecast" tile is gone rather than ported. It summed deals in
 * `NEGOTIATION` or `WON` — a stage vocabulary this product does not require any
 * tenant to use, and a bucket that counted already-won deals into a forecast of
 * what is still to come. There is no server-side commit category to replace it
 * with, and inventing one here is what got us the last one.
 */

interface SnapshotOverrideRowProps {
  snapshotId: string;
  period: string;
  totalWeighted: number;
  overrideAmount: string | null | undefined;
}

function SnapshotOverrideRow({ snapshotId, period, totalWeighted, overrideAmount }: SnapshotOverrideRowProps) {
  const money = useOrgDisplay();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const overrideForecast = useOverrideForecast();

  const handleStartEdit = useCallback(() => {
    setAmount(overrideAmount ?? "");
    setNote("");
    setEditing(true);
  }, [overrideAmount]);

  const handleCancel = useCallback(() => setEditing(false), []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value), []);
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value), []);

  const handleSave = useCallback(() => {
    const parsed = Number(amount);
    if (amount && Number.isNaN(parsed)) {
      toast.error("Enter a valid number");
      return;
    }
    overrideForecast.mutate(
      { snapshotId, overrideAmount: amount ? parsed : undefined, overrideNote: note || undefined },
      {
        onSuccess: () => {
          toast.success("Override saved");
          setEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [amount, note, snapshotId, overrideForecast]);

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-xs">{period}</p>
        <p className="text-xs text-muted-foreground">
          Weighted: {formatMoneyCompact(totalWeighted, money)}
          {overrideAmount && (
            <span className="ml-2 text-primary">Override: {formatMoneyCompact(overrideAmount, money)}</span>
          )}
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={amount}
            onChange={handleAmountChange}
            placeholder="Override amount"
            className="h-6 w-24 text-xs"
          />
          <Input
            value={note}
            onChange={handleNoteChange}
            placeholder="Note"
            className="h-6 w-20 text-xs"
          />
          <AnimatedIconButton icon={CheckIcon} iconSize={12} size="icon" variant="ghost" className="h-6 w-6" aria-label="Save forecast override" onClick={handleSave} disabled={overrideForecast.isPending} />
          <AnimatedIconButton icon={XIcon} iconSize={12} size="icon" variant="ghost" className="h-6 w-6" aria-label="Cancel forecast edit" onClick={handleCancel} />
        </div>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Edit forecast amount" onClick={handleStartEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function DealForecastSummary() {
  const money = useOrgDisplay();
  const canManage = useCan("crm:deals:manage");
  const forecast = useDealForecast();
  const { data: snapshots = [] } = useForecastSnapshots({ limit: 5 });

  const handleRetry = useCallback(() => { void forecast.refetch(); }, [forecast]);

  if (forecast.isLoading)
    return (
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  if (forecast.isError)
    return (
      <ErrorState
        title="Could not load the forecast"
        description={getErrorMessage(forecast.error)}
        onRetry={handleRetry}
      />
    );

  if (!forecast.data) return null;

  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard
          label="Total Pipeline"
          value={formatMoneyCompact(forecast.data.totalBestCase, money)}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Weighted Forecast"
          value={formatMoneyCompact(forecast.data.totalWeighted, money)}
          icon={Target}
          tone="blue"
        />
        <StatCard
          label="Open Deals"
          value={forecast.data.totalDeals}
          icon={Layers}
          tone="emerald"
        />
      </StatCardGrid>

      {/*
        Directly under the totals, not in a footnote. Whether the weighted figure
        is a learned probability or the tenant's own stage percentage changes
        what it is reasonable to do with it.
      */}
      <ForecastBasisCard basis={forecast.data.basis} />

      {canManage && snapshots.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">Forecast Snapshots</p>
          {snapshots.map((s) => (
            <SnapshotOverrideRow
              key={s.id}
              snapshotId={s.id}
              period={s.period}
              totalWeighted={s.data.totalWeighted}
              overrideAmount={s.overrideAmount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
