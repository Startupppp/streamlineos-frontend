"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Camera } from "lucide-react";
import { useCfdReport, useCaptureSnapshot } from "@/hooks/api/build/reports";
import { useCan } from "@/hooks/api/access";
import { format } from "date-fns";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ChartCard } from "./chart-card";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

const CfdChart = dynamic(
  () => import("./cfd-chart").then((m) => ({ default: m.CfdChart })),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

export function CfdSection({ projectId, filtersActive = false }: { projectId: number; filtersActive?: boolean }) {
  const canManage = useCan("build:manage");
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, error, refetch } = useCfdReport(projectId, days);
  const capture = useCaptureSnapshot(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  function handleDaysChange(value: string) {
    setDays(Number(value));
  }

  function handleCapture() {
    capture.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(`Snapshot captured (${result.captured} states)`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        backlog: p.backlog,
        unstarted: p.unstarted,
        started: p.started,
        completed: p.completed,
        cancelled: p.cancelled,
      })),
    [data],
  );

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: chartData.length === 0,
  });

  const actions = (
    <div className="flex items-center gap-2">
      <Select value={String(days)} onValueChange={handleDaysChange}>
        <SelectTrigger aria-label="Cumulative flow time range" className="w-28 text-sm bg-muted/40 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="14">14 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="60">60 days</SelectItem>
          <SelectItem value="90">90 days</SelectItem>
        </SelectContent>
      </Select>
      {canManage ? (
        <LoadingButton
          size="sm"
          variant="outline"
          className=""
          onClick={handleCapture}
          isPending={capture.isPending}
          loadingText="Capturing…"
        >
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Capture today
        </LoadingButton>
      ) : null}
    </div>
  );

  return (
    <ChartCard title="Cumulative Flow" icon={Layers} actions={actions}>
      {filtersActive ? (
        <p className="mb-2 text-xs text-muted-foreground">Filters do not apply to this chart. It shows project-wide daily snapshots.</p>
      ) : null}
      <PageState
        resolution={resolution}
        loading={<LoadingState variant="cards" rows={2} />}
        empty={
          <EmptyState
            illustration={<EmptyLeaderboardIllustration />}
            title="No flow history yet"
            description={
              canManage
                ? "The cumulative flow diagram accrues one data point per day. Capture today's snapshot to start building history."
                : "The cumulative flow diagram accrues one data point per day. History appears once project snapshots are available."
            }
            action={
              canManage ? {
                label: capture.isPending ? "Capturing…" : "Capture today's snapshot",
                onClick: handleCapture,
              } : undefined
            }
            compact
          />
        }
        onRetry={handleRetry}
        compact
      >
        <CfdChart data={chartData} />
      </PageState>
    </ChartCard>
  );
}
