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
