"use client";

import { useCallback, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import {
  useHealthScores,
  useHealthConfig,
  useUpdateHealthConfig,
  useRecomputeHealth,
  type H@/hooks/api/crm
  type HealthScoreWeights,
  type HealthScoreThresholds,
  type HealthScoreBreakdown,
} from "@/hooks/api/crm";
import {
  healthStatusColors,
  healthDotColors,
  getColorSafe,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_LABELS: Record<HealthScoreItem["status"], string> = {
  healthy: "Healthy",
  at_risk: "At Risk",
  critical: "Critical",
};

const STATUS_CHART_COLORS: Record<HealthScoreItem["status"], string> = {
  healthy: "#10B981",
  at_risk: "#F59E0B",
  critical: "#EF4444",
};

const WEIGHT_FIELDS: { key: keyof HealthScoreWeights; label: string }[] = [
  { key: "sla", label: "SLA compliance" },
  { key: "csat", label: "CSAT" },
  { key: "activity", label: "Activity recency" },
  { key: "renewal", label: "Renewal proximity" },
  { key: "tickets", label: "Open tickets" },
];

const BREAKDOWN_FIELDS: { key: keyof HealthScoreBreakdown; label: string }[] = [
  { key: "sla", label: "SLA" },
  { key: "csat", label: "CSAT" },
  { key: "activity", label: "Activity" },
  { key: "renewal", label: "Renewal" },
  { key: "tickets", label: "Tickets" },
];

type SortKey = "name" | "score" | "status";
type SortDir = "asc" | "desc";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

interface WeightSliderRowProps {
  field: { key: keyof HealthScoreWeights; label: string };
  value: number;
  onChange: (key: keyof HealthScoreWeights, value: number) => void;
}

function WeightSliderRow({ field, value, onChange }: WeightSliderRowProps) {
  const handleChange = useCallback(
    (v: number[]) => onChange(field.key, v[0] ?? 0),
    [field.key, onChange],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{field.label}</Label>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={handleChange}
        aria-label={`${field.label} weight`}
      />
    </div>
  );
}

function ConfigSheet({
  open,
  onOpenChange,
  initialWeights,
  initialThresholds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWeights: HealthScoreWeights;
  initialThresholds: HealthScoreThresholds;
}) {
  const update = useUpdateHealthConfig();
  const [weights, setWeights] = useState<HealthScoreWeights>(initialWeights);
  const [thresholds, setThresholds] =
    useState<HealthScoreThresholds>(initialThresholds);

  const totalWeight =
    weights.sla +
    weights.csat +
    weights.activity +
    weights.renewal +
    weights.tickets;
  const thresholdsValid = thresholds.healthy > thresholds.atRisk;
  const canSave = totalWeight > 0 && thresholdsValid && !update.isPending;

  function handleWeightChange(key: keyof HealthScoreWeights, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  function handleThresholdChange(
    key: keyof HealthScoreThresholds,
    raw: string,
  ) {
    const value = Math.max(0, Math.min(100, Number(raw) || 0));
    setThresholds((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!canSave) return;
    update.mutate(
      { weights, thresholds },
      {
        onSuccess: () => {
          toast.success("Health config saved. Recompute to apply.");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to save config"),
      },
    );
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleHealthyThresholdChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    handleThresholdChange("healthy", e.target.value);
  }

  function handleAtRiskThresholdChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleThresholdChange("atRisk", e.target.value);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-0">
          <SheetTitle>Scoring configuration</SheetTitle>
          <SheetDescription>
            Tune the weight of each signal and the thresholds that classify
            accounts.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Signal weights
              </h3>
              <Badge
                variant={totalWeight > 0 ? "secondary" : "destructive"}
                className="tabular-nums"
              >
                Total {totalWeight}
              </Badge>
            </div>
            {WEIGHT_FIELDS.map((field) => (
              <WeightSliderRow
                key={field.key}
                field={field}
                value={weights[field.key]}
                onChange={handleWeightChange}
              />
            ))}
            {totalWeight === 0 && (
              <p className="text-xs text-destructive">
                At least one weight must be greater than zero.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Thresholds
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground"
                    aria-label="What do the thresholds mean?"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64">
                  <p className="text-xs font-semibold text-foreground mb-1.5">
                    Health bands
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      <span className="font-medium text-emerald-600">
                        Healthy
                      </span>{" "}
                      — score at or above the healthy threshold; account shows
                      positive signals and low churn risk.
                    </li>
                    <li>
                      <span className="font-medium text-amber-600">
                        At risk
                      </span>{" "}
                      — between the two thresholds; needs attention.
                    </li>
                    <li>
                      <span className="font-medium text-red-600">Critical</span>{" "}
                      — below the at-risk threshold; warrants immediate
                      intervention.
                    </li>
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Adjust to match your retention strategy.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Healthy ≥</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={thresholds.healthy}
                  onChange={handleHealthyThresholdChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">At risk ≥</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={thresholds.atRisk}
                  onChange={handleAtRiskThresholdChange}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Scores below the at-risk threshold are classified as critical.
            </p>
            {!thresholdsValid && (
              <p className="text-xs text-destructive">
                Healthy threshold must be greater than at-risk threshold.
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="px-0">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="flex-1">
            {update.isPending ? "Saving…" : "Save config"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function BreakdownPopover({ breakdown }: { breakdown: HealthScoreBreakdown }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="View score breakdown"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="text-xs font-semibold text-foreground mb-2">Sub-scores</p>
        <div className="space-y-2">
          {BREAKDOWN_FIELDS.map((field) => {
            const value = breakdown[field.key];
            return (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      scoreColor(value),
                    )}
                  >
                    {value}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AccountHealthPage() {
  const { data, isLoading, isError, refetch } = useHealthScores();
  const config = useHealthConfig();
  const recompute = useRecomputeHealth();

  const [configOpen, setConfigOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const summary = data?.summary ?? {
    healthy: 0,
    atRisk: 0,
    critical: 0,
    total: 0,
    avgScore: 0,
  };

  const chartData = useMemo(
    () =>
      [
        { name: "Healthy", value: summary.healthy, status: "healthy" as const },
        { name: "At Risk", value: summary.atRisk, status: "at_risk" as const },
        {
          name: "Critical",
          value: summary.critical,
          status: "critical" as const,
        },
      ].filter((d) => d.value > 0),
    [summary.healthy, summary.atRisk, summary.critical],
  );

  const sortedItems = useMemo(() => {
    const statusRank: Record<HealthScoreItem["status"], number> = {
      critical: 0,
      at_risk: 1,
      healthy: 2,
    };
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.clientName.localeCompare(b.clientName);
      else if (sortKey === "score") cmp = a.score - b.score;
      else cmp = statusRank[a.status] - statusRank[b.status];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  }

  function handleRecompute() {
    recompute.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(`Recomputed ${res.total} accounts`);
        refetch();
      },
      onError: () => toast.error("Failed to recompute scores"),
    });
  }

  function handleOpenConfig() {
    setConfigOpen(true);
  }

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const recomputeButton = (
    <Button size="sm" onClick={handleRecompute} disabled={recompute.isPending}>
      <RefreshCw
        className={cn("h-4 w-4 mr-1.5", recompute.isPending && "animate-spin")}
      />
      {recompute.isPending ? "Recomputing…" : "Recompute now"}
    </Button>
  );

  return (
    <PageWrapper
      title="Account Health"
      subtitle="Composite health scores per client account from SLA, CSAT, activity, renewal, and ticket signals"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenConfig}
            disabled={config.isLoading}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Configure
          </Button>
          {recomputeButton}
        </div>
      }
    >
      {isLoading ? (
        <LoadingState variant="page" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load health scores"
          description="An error occurred while loading account health. Please try again."
          onRetry={handleRetry}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-1 min-h-[60vh] items-center justify-center">
          <EmptyState
            illustration={<EmptyPersonIllustration />}
            title="No health scores yet"
            description="Run a recompute to generate scores across your client accounts from their latest signals."
            action={{ label: "Recompute now", onClick: handleRecompute }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Avg Score"
              value={summary.avgScore}
              icon={Activity}
              color="blue"
              index={0}
            />
            <StatCard
              label="Healthy"
              value={summary.healthy}
              icon={ShieldCheck}
              color="green"
              index={1}
            />
            <StatCard
              label="At Risk"
              value={summary.atRisk}
              icon={AlertTriangle}
              color="amber"
              index={2}
            />
            <StatCard
              label="Critical"
              value={summary.critical}
              icon={HeartPulse}
              color="red"
              index={3}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No scored accounts
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((d) => (
                          <Cell
                            key={d.status}
                            fill={STATUS_CHART_COLORS[d.status]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.5rem",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "0.75rem",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {(["healthy", "at_risk", "critical"] as const).map(
                    (status) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: STATUS_CHART_COLORS[status],
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Accounts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-2.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                          >
                            Account
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort("score")}
                            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                          >
                            Score
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort("status")}
                            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                          >
                            Status
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                          Updated
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground sr-only">
                          Breakdown
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item) => (
                        <tr
                          key={item.clientAccountId}
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  getColorSafe(healthDotColors, item.status),
                                )}
                              />
                              <span className="font-medium text-foreground truncate">
                                {item.clientName}
                              </span>
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right tabular-nums font-semibold",
                              scoreColor(item.score),
                            )}
                          >
                            {item.score}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                getColorSafe(healthStatusColors, item.status),
                              )}
                            >
                              {STATUS_LABELS[item.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                            {formatDistanceToNow(new Date(item.computedAt), {
                              addSuffix: true,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <BreakdownPopover breakdown={item.breakdown} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {config.data && (
        <ConfigSheet
          key={JSON.stringify(config.data)}
          open={configOpen}
          onOpenChange={setConfigOpen}
          initialWeights={config.data.weights}
          initialThresholds={config.data.thresholds}
        />
      )}
    </PageWrapper>
  );
}
