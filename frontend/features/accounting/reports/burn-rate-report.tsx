"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { useBurnRate, useCashRunway } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull, formatINRCompact } from "@/lib/format-utils";
import { Flame, Clock, TrendingDown } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

export function BurnRateReport() {
  const burnQuery = useBurnRate();
  const runwayQuery = useCashRunway();

  function handleRetry(): void {
    void burnQuery.refetch();
    void runwayQuery.refetch();
  }

  const isLoading = burnQuery.isLoading || runwayQuery.isLoading;
  const error = burnQuery.error ?? runwayQuery.error;

  const projectedData =
    runwayQuery.data?.projectedMonths.map((m) => ({
      month: m.month.slice(5),
      balance: Number(m.projectedBalance),
    })) ?? [];

  const burnData = burnQuery.data;
  const runwayData = runwayQuery.data;

  return (
    <ReportShell
      title="Burn Rate & Cash Runway"
      subtitle="Average monthly cash outflow and projected months of runway."
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={3} />
      ) : error ? (
        <ErrorState
          title="Failed to load burn rate data"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          <StatCardGrid cols={3}>
            <StatCard
              label="Avg Burn Rate"
              value={burnData ? formatINRCompact(Number(burnData.averageBurnRate)) : "—"}
              icon={Flame}
              tone="red"
              hint="per month (3-month avg)"
            />
            <StatCard
              label="Current Cash"
              value={runwayData ? formatINRCompact(Number(runwayData.cashBalance)) : "—"}
              icon={TrendingDown}
              tone="blue"
            />
            <StatCard
              label="Runway"
              value={runwayData?.runwayMonths != null ? `${runwayData.runwayMonths} months` : "N/A"}
              icon={Clock}
              tone={
                runwayData?.runwayMonths != null
                  ? runwayData.runwayMonths >= 12
                    ? "emerald"
                    : runwayData.runwayMonths >= 6
                    ? "amber"
                    : "red"
                  : "default"
              }
              hint={runwayData?.runwayMonths != null
                ? runwayData.runwayMonths >= 12 ? "Healthy" : runwayData.runwayMonths >= 6 ? "Watch" : "Critical"
                : undefined}
            />
          </StatCardGrid>

          {projectedData.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-4">Projected Cash Balance</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projectedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={AXIS_TICK} />
                  <YAxis
                    tick={AXIS_TICK}
                    tickFormatter={(v: number) => formatINRCompact(v)}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: unknown) => [formatCurrencyFull(Number(v)), "Projected Balance"]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center min-h-[200px]">
              <EmptyState
                illustration={<EmptyChartIllustration />}
                title="No projection data"
                description="Cash runway projection will appear once burn rate history is available."
                compact
              />
            </div>
          )}

          {burnData && burnData.months.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2.5 bg-muted/40 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Outflow History</p>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[300px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Month</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Net Outflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {burnData.months.map((m) => (
                      <TableRow key={m.month} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="text-sm text-foreground px-3 py-2">{m.month}</TableCell>
                        <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">
                          {formatCurrencyFull(Number(m.netOutflow))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </ReportShell>
  );
}
