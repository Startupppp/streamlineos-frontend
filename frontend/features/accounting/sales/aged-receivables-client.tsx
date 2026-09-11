"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { RECEIVABLES_READ, useArAging } from "@/hooks/api/accounting/ar";
import type { AgingBasis, AgingPartyRow } from "@/types/accounting-ar";
import { AGING_BUCKET_KEYS, AGING_BUCKET_LABEL } from "./ar-labels";
import { AgingOpenItemsSheet } from "./aging-open-items-sheet";
import { useListUrlState } from "./use-list-url-state";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isBasis(value: string): value is AgingBasis {
  return value === "due" || value === "issue";
}

export function AgedReceivablesClient() {
  const canRead = useCan(RECEIVABLES_READ);
  const url = useListUrlState();
  const [drillParty, setDrillParty] = useState<{ id: string; name: string } | null>(null);

  const asOf = url.get("asOf") || todayIso();
  const basisParam = url.get("basis");
  const basis: AgingBasis = isBasis(basisParam) ? basisParam : "due";

  const agingQuery = useArAging({ asOf, basis });
  const aging = agingQuery.data;
  const danger = statusToneClasses("danger");

  const columns: DataTableColumn<AgingPartyRow>[] = [
    {
      key: "partyName",
      header: "Customer",
      cell: (row) => (
        <button
          type="button"
          className="truncate text-sm font-medium text-status-info-ink hover:underline"
          onClick={() => setDrillParty({ id: row.partyId, name: row.partyName })}
        >
          {row.partyName}
        </button>
      ),
    },
    ...AGING_BUCKET_KEYS.map<DataTableColumn<AgingPartyRow>>((bucket) => ({
      key: bucket,
      header: AGING_BUCKET_LABEL[bucket],
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.buckets[bucket], row.currency)}
        </span>
      ),
    })),
    {
      key: "totalMinor",
      header: "Total",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense font-medium tabular-nums">
          {formatMinorMoney(row.totalMinor, row.currency)}
        </span>
      ),
    },
  ];

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <DatePicker
        value={asOf}
        onChange={(value) => url.setParams({ asOf: value || undefined })}
        dateFormat="dd MMM yyyy"
        className="w-auto min-w-[12rem]"
      />
      <Select value={basis} onValueChange={(value) => url.setParams({ basis: value })}>
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Age from">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="due">Age from the due date</SelectItem>
          <SelectItem value="issue">Age from the invoice date</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (!canRead) {
    return (
      <PageWrapper title="What customers owe us">
        <NoPermissionState permission={RECEIVABLES_READ} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="What customers owe us"
      subtitle={`Everything still open on ${formatShortDate(asOf)}, grouped by how late it is.`}
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      filters={filters}
    >
      {aging && !aging.reconciliation.balanced ? (
        <div
          className={cn(
            "mb-3 flex shrink-0 items-start gap-3 rounded-xl border p-4",
            danger.surface,
            danger.rule,
          )}
          role="alert"
        >
          <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", danger.ink)} />
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", danger.inkStrong)}>
              These numbers do not tie back to your books
            </p>
            <p className={cn("mt-1 text-label", danger.ink)}>
              This report adds up to{" "}
              {formatMinorMoney(aging.reconciliation.agingFunctionalMinor, aging.baseCurrency)} but the
              customer control account in your ledger says{" "}
              {formatMinorMoney(aging.reconciliation.arControlBalanceMinor, aging.baseCurrency)} — a
              difference of{" "}
              {formatMinorMoney(aging.reconciliation.differenceMinor, aging.baseCurrency)}. Do not send
              statements or chase payment from this report until it is reconciled.
            </p>
          </div>
        </div>
      ) : null}

      <StatCardGrid cols={5} className="shrink-0 mb-2">
        {AGING_BUCKET_KEYS.map((bucket) => (
          <StatCard
            key={bucket}
            label={AGING_BUCKET_LABEL[bucket]}
            value={aging ? formatMinorMoney(aging.totals[bucket], aging.baseCurrency) : "—"}
            tone={bucket === "days91Plus" ? "red" : bucket === "days0to30" ? "emerald" : "amber"}
            isLoading={agingQuery.isLoading}
          />
        ))}
        <StatCard
          label="Owed in total"
          value={aging ? formatMinorMoney(aging.totals.functionalTotalMinor, aging.baseCurrency) : "—"}
          tone="blue"
          isLoading={agingQuery.isLoading}
        />
      </StatCardGrid>

      {agingQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't build the ageing report"
          description={getErrorMessage(agingQuery.error)}
          onRetry={() => void agingQuery.refetch()}
        />
      ) : (
        <DataTable
          data={aging?.rows ?? []}
          columns={columns}
          getRowKey={(row) => `${row.partyId}-${row.currency}`}
          isLoading={agingQuery.isLoading}
          minWidth="900px"
          className="flex-1 min-h-0"
          pagination={{ pageSize: 50 }}
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              illustrationPreset="chart"
              title="Nobody owes you anything"
              description="Every invoice up to this date has been settled."
            />
          }
        />
      )}

      <AgingOpenItemsSheet
        party={drillParty}
        asOf={asOf}
        basis={basis}
        onOpenChange={(open) => {
          if (!open) setDrillParty(null);
        }}
      />
    </PageWrapper>
  );
}
