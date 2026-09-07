"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import type { ForecastWeek } from "@/types/accounting/planning";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { Money, SELECT_NONE_VALUE } from "@/features/accounting/shared";
import {
  useForecast,
  useForecastCompare,
  useScenarios,
  useSeedDefaultScenarios,
} from "@/hooks/api/accounting/planning";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const CompareChart = dynamic(
  () =>
    import("@/features/accounting/planning/forecast-charts").then((m) => ({
      default: m.CompareChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-xl" /> },
);

const ForecastAreaChart = dynamic(
  () =>
    import("@/features/accounting/planning/forecast-charts").then((m) => ({
      default: m.ForecastAreaChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[260px] w-full rounded-xl" /> },
);

function formatWeekStartCell(weekStart: string) {
  return <span className="text-sm text-foreground">{formatWeekStart(weekStart)}</span>;
}

const forecastWeekColumns: DataTableColumn<ForecastWeek>[] = [
  {
    key: "week",
    header: "Week",
    cell: (row) => formatWeekStartCell(row.weekStart),
  },
  {
    key: "inflows",
    header: "Inflows",
    cell: (row) => <div className="text-right"><Money value={parseFloat(row.inflows)} /></div>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.inflows),
  },
  {
    key: "outflows",
    header: "Outflows",
    cell: (row) => <div className="text-right"><Money value={parseFloat(row.outflows)} /></div>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.outflows),
  },
  {
    key: "net",
    header: "Net",
    cell: (row) => (
      <div className="text-right">
        <Money value={parseFloat(row.net)} className={parseFloat(row.net) < 0 ? "text-status-danger-ink" : undefined} />
      </div>
    ),
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.net),
  },
  {
    key: "closingCash",
    header: "Closing Cash",
    cell: (row) => <div className="text-right"><Money value={parseFloat(row.closingCash)} /></div>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.closingCash),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) =>
      row.minimumBalanceWarning ? (
        <Badge variant="outline" className="bg-status-warning-surface text-status-warning-ink border-status-warning-rule text-micro px-1.5 py-0 h-4">
          Warning
        </Badge>
      ) : null,
  },
];

interface ScenarioCheckboxProps {
  id: number;
  name: string;
  checked: boolean;
  onToggle: (id: number) => void;
}

function ScenarioCheckbox({ id, name, checked, onToggle }: ScenarioCheckboxProps) {
  function handleChange(): void {
    onToggle(id);
  }
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <Checkbox checked={checked} onCheckedChange={handleChange} />
      {name}
    </label>
  );
}

function formatWeekStart(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ForecastPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | undefined>(undefined);
  const [weeks, setWeeks] = useState(13);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());

  const scenariosQuery = useScenarios();
  const scenarios = scenariosQuery.data ?? [];

  const forecastQuery = useForecast({
    weeks,
    scenarioId: selectedScenarioId,
  });

  const compareIdsArray = Array.from(compareIds);
  const compareQuery = useForecastCompare(compareIdsArray);

  const seedMutation = useSeedDefaultScenarios();
  const canManageForecast = useCan("accounting:forecast:manage");

  function handleScenarioChange(value: string): void {
    setSelectedScenarioId(value === SELECT_NONE_VALUE ? undefined : Number(value));
  }

  function handleWeeksChange(e: ChangeEvent<HTMLInputElement>): void {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v) && v >= 4 && v <= 52) setWeeks(v);
  }

  function handleToggleCompare(): void {
    setCompareMode((prev) => !prev);
    setCompareIds(new Set());
  }

  function handleCompareIdToggle(id: number): void {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSeedDefaults(): void {
    seedMutation.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(`Seeded ${data.created} default scenario(s)`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRetry(): void {
    void forecastQuery.refetch();
  }

  const forecastData = (forecastQuery.data?.weeks ?? []).map((w) => ({
    weekStart: formatWeekStart(w.weekStart),
    rawWeekStart: w.weekStart,
    closingCash: parseFloat(w.closingCash),
    inflows: parseFloat(w.inflows),
    outflows: parseFloat(w.outflows),
    net: parseFloat(w.net),
    warning: w.minimumBalanceWarning,
  }));

  const warningWeeks = forecastData.filter((w) => w.warning);

  const compareData = (compareQuery.data?.weeks ?? []).map((w) => {
    const entry: Record<string, string | number> = {
      weekStart: formatWeekStart(w.weekStart),
    };
    for (const [scenarioId, val] of Object.entries(w.closingCash)) {
      entry[scenarioId] = parseFloat(val);
    }
    return entry;
  });

  const totalInflows = parseFloat(forecastQuery.data?.totalInflows ?? "0");
  const totalOutflows = parseFloat(forecastQuery.data?.totalOutflows ?? "0");

  const filtersNode = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select
        value={selectedScenarioId !== undefined ? String(selectedScenarioId) : SELECT_NONE_VALUE}
        onValueChange={handleScenarioChange}
      >
        <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
          <SelectValue placeholder="Default scenario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_NONE_VALUE}>Default</SelectItem>
          {scenarios.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Weeks:</span>
        <Input
          type="number"
          min={4}
          max={52}
          value={weeks}
          onChange={handleWeeksChange}
          className="w-20 text-xs"
        />
      </div>

      <Button
        variant={compareMode ? "default" : "outline"}
        size="sm"
        className="text-xs"
        onClick={handleToggleCompare}
      >
        Compare Scenarios
      </Button>

      {canManageForecast && scenarios.length === 0 && (
        <LoadingButton
          variant="outline"
          size="sm"
          className="text-xs"
          isPending={seedMutation.isPending}
          loadingText="Seeding…"
          onClick={handleSeedDefaults}
        >
          Seed Defaults
        </LoadingButton>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Cash Forecast"
      subtitle="13-week rolling cash forecast"
      filters={filtersNode}
    >
      {compareMode ? (
        <div className="flex flex-1 min-h-0 flex-col space-y-4">
          <Card className="bg-card border border-border rounded-xl shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">
                Select Scenarios to Compare
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-3">
                {scenarios.map((s) => (
                  <ScenarioCheckbox
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    checked={compareIds.has(s.id)}
                    onToggle={handleCompareIdToggle}
                  />
                ))}
              </div>
              {scenarios.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No scenarios available. Seed defaults first.
                </p>
              )}
            </CardContent>
          </Card>

          {compareIds.size >= 2 && (
            <>
              {compareQuery.isLoading && <Skeleton className="h-[280px] w-full rounded-xl" />}
              {compareQuery.error && (
                <ErrorState
                  title="Failed to load comparison"
                  description={getErrorMessage(compareQuery.error)}
                />
              )}
              {!compareQuery.isLoading && !compareQuery.error && compareData.length > 0 && (
                <CompareChart compareData={compareData} scenarios={compareQuery.data?.scenarios ?? []} />
              )}
            </>
          )}

          {compareIds.size < 2 && (
            <EmptyState
              illustration={<EmptyChartIllustration />}
              title="Select at least 2 scenarios"
              description="Choose scenarios above to compare their cash projections."
            />
          )}
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col space-y-4">
          {forecastQuery.error && (
            <ErrorState
              title="Failed to load forecast"
              description={getErrorMessage(forecastQuery.error)}
              onRetry={handleRetry}
            />
          )}

          {!forecastQuery.isLoading && !forecastQuery.error && forecastData.length === 0 && (
            <EmptyState
              illustration={<EmptyChartIllustration />}
              title="No forecast data"
              description="Seed default scenarios or configure assumptions to generate a forecast."
            />
          )}

          {forecastData.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-card border border-border rounded-xl shadow-sm">
                  <CardContent className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Inflows</p>
                    <Money value={totalInflows} className="text-base font-semibold text-status-success-ink" />
                  </CardContent>
                </Card>
                <Card className="bg-card border border-border rounded-xl shadow-sm">
                  <CardContent className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Outflows</p>
                    <Money value={totalOutflows} className="text-base font-semibold" />
                  </CardContent>
                </Card>
              </div>

              <ForecastAreaChart forecastData={forecastData} warningWeeks={warningWeeks} />

              <DataTable
                className="flex-1 min-h-0"
                data={forecastQuery.data?.weeks ?? []}
                columns={forecastWeekColumns}
                getRowKey={(row) => row.weekIndex}
                isLoading={forecastQuery.isLoading}
                minWidth="640px"
              />
            </>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
