"use client";

import { useMemo, useState, useCallback } from "react";
import { TrendingUp, Target, Handshake, Pencil } from "lucide-react";
import { XIcon, CheckIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatMoneyCompact } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useForecastSnapshots, useOverrideForecast } from "@/hooks/api/crm/deals";
import type { Deal } from "@/types/crm";
import { useOrgDisplay } from "@/hooks/api/org-display";

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

interface DealForecastSummaryProps {
  deals: Deal[];
}

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
          <AnimatedIconButton icon={CheckIcon} iconSize={12} size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave} disabled={overrideForecast.isPending} />
          <AnimatedIconButton icon={XIcon} iconSize={12} size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel} />
        </div>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleStartEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function DealForecastSummary({ deals }: DealForecastSummaryProps) {
  const money = useOrgDisplay();
  const canManage = useCan("crm:deals:manage");
  const { data: snapshots = [] } = useForecastSnapshots({ limit: 5 });

  const { totalPipeline, weightedForecast, commitForecast } = useMemo(() => {
    const open = deals.filter((d) => d.stage !== "LOST");
    let pipeline = 0;
    let weighted = 0;
    let commit = 0;

    for (const d of open) {
      const value = Number(d.value ?? 0);
      const prob =
        d.probability != null && d.probability > 0
          ? d.probability
          : (STAGE_PROBABILITY[d.stage] ?? 0);

      pipeline += value;
      weighted += value * (prob / 100);

      if (d.stage === "NEGOTIATION" || d.stage === "WON") {
        commit += value;
      }
    }

    return { totalPipeline: pipeline, weightedForecast: weighted, commitForecast: commit };
  }, [deals]);

  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard
          label="Total Pipeline"
          value={formatMoneyCompact(totalPipeline, money)}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Weighted Forecast"
          value={formatMoneyCompact(weightedForecast, money)}
          icon={Target}
          tone="blue"
        />
        <StatCard
          label="Commit Forecast"
          value={formatMoneyCompact(commitForecast, money)}
          icon={Handshake}
          tone="emerald"
        />
      </StatCardGrid>

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
