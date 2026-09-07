"use client";

import { useCallback, useMemo } from "react";
import { AlertTriangle, Briefcase, Clock } from "lucide-react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useClientProfitabilityReport } from "@/hooks/api/timesheets-core/reports";
import type { ClientProfitabilityClient, ReportCurrencyAmount } from "./reports-types";
import { formatReportHours, formatReportMoney } from "./report-format";

interface ClientProfitabilityTabProps {
  params: { startDate: string; endDate: string };
  enabled: boolean;
}

function AmountLines({
  amounts,
  render,
}: {
  amounts: ReportCurrencyAmount[];
  render: (a: ReportCurrencyAmount) => { text: string; negative?: boolean } | null;
}) {
  const lines = amounts
    .map((a) => ({ currency: a.currency, value: render(a) }))
    .filter((l): l is { currency: string; value: { text: string; negative?: boolean } } => l.value !== null);

  if (lines.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-0.5">
      {lines.map((l) => (
        <p
          key={l.currency}
          className={cn(
            "tabular-nums",
            l.value.negative ? "text-status-danger-ink" : undefined,
          )}
        >
          {l.value.text}
        </p>
      ))}
    </div>
  );
}

const COLUMNS: DataTableColumn<ClientProfitabilityClient>[] = [
  {
    key: "client",
    header: "Client",
    cell: (row) => (
      <span className="truncate font-medium text-foreground">{row.clientName}</span>
    ),
    sortable: true,
    sortValue: (row) => row.clientName.toLowerCase(),
    className: "max-w-[220px]",
  },
  {
    key: "hours",
    header: "Hours",
    cell: (row) => <span className="tabular-nums">{formatReportHours(row.hours)}</span>,
    sortable: true,
    sortValue: (row) => row.hours,
  },
  {
    key: "billableAmount",
    header: "Billable",
    cell: (row) => (
      <AmountLines
        amounts={row.amounts}
        render={(a) => ({ text: formatReportMoney(a.billableAmount, a.currency) })}
      />
    ),
  },
  {
    key: "costAmount",
    header: "Cost",
    cell: (row) => (
      <AmountLines
        amounts={row.amounts}
        render={(a) =>
          a.costAmount === null ? null : { text: formatReportMoney(a.costAmount, a.currency) }
        }
      />
    ),
  },
  {
    key: "margin",
    header: "Margin",
    cell: (row) => (
      <AmountLines
        amounts={row.amounts}
        render={(a) =>
          a.margin === null
            ? null
            : { text: formatReportMoney(a.margin, a.currency), negative: a.margin < 0 }
        }
      />
    ),
  },
  {
    key: "missingRateHours",
    header: "Missing Rate",
    cell: (row) =>
      row.missingRateHours > 0 ? (
        <span className="tabular-nums text-status-warning-ink">
          {formatReportHours(row.missingRateHours)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortable: true,
    sortValue: (row) => row.missingRateHours,
  },
];

function getClientRowKey(row: ClientProfitabilityClient): string {
  return row.clientId != null ? String(row.clientId) : "no-client";
}

function renderClientMobileCard(row: ClientProfitabilityClient) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{row.clientName}</p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatReportHours(row.hours)}
        </span>
      </div>
      {row.amounts.map((a) => (
        <p key={a.currency} className="text-xs tabular-nums text-muted-foreground">
          {formatReportMoney(a.billableAmount, a.currency)} billed
          {a.margin !== null ? ` · ${formatReportMoney(a.margin, a.currency)} margin` : ""}
        </p>
      ))}
      {row.missingRateHours > 0 ? (
        <p className="text-xs tabular-nums text-status-warning-ink">
          {formatReportHours(row.missingRateHours)} missing a bill rate
        </p>
      ) : null}
    </div>
  );
}

export function ClientProfitabilityTab({ params, enabled }: ClientProfitabilityTabProps) {
  const { data, isLoading, isError, refetch } = useClientProfitabilityReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const clients = data?.clients ?? [];
    return {
      clients: clients.length,
      hours: clients.reduce((a, c) => a + c.hours, 0),
      missingRateHours: clients.reduce((a, c) => a + c.missingRateHours, 0),
    };
  }, [data]);

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load client profitability"
        description="Something went wrong while loading the client profitability report."
        onRetry={handleRetry}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGrid cols={3}>
        <StatCard label="Clients" value={stats.clients} icon={Briefcase} tone="blue" />
        <StatCard
          label="Approved Billable Hours"
          value={stats.hours.toFixed(1)}
          icon={Clock}
          tone="emerald"
        />
        <StatCard
          label="Hours Missing a Rate"
          value={stats.missingRateHours.toFixed(1)}
          icon={AlertTriangle}
          tone={stats.missingRateHours > 0 ? "amber" : "default"}
        />
      </StatCardGrid>

      {data.clients.length === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No billable activity"
          description="No approved billable hours were found in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <DataTable
          data={data.clients}
          columns={COLUMNS}
          getRowKey={getClientRowKey}
          pagination={{}}
          mobileCard={renderClientMobileCard}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
