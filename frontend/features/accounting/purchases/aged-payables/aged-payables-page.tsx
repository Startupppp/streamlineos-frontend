"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { useCan } from "@/hooks/api/access";
import { useApAging } from "@/hooks/api/accounting/ap";
import { AP_AGING_BUCKETS, type ApAgingPartyRow } from "@/types/accounting-ap-payments";
import { AGING_BUCKET_LABELS } from "../lib/ap-labels";
import { todayIso } from "../lib/ap-dates";
import { useUrlListState } from "../lib/use-url-list-state";
import { AgingTieOutBanner } from "./aging-tie-out-banner";
import { VendorAgingSheet } from "./vendor-aging-sheet";

const PAGE_SIZE = 20;

export function AgedPayablesPage() {
  const canRead = useCan("accounting:reports:read");
  const { getParam, setParams, page, setPage } = useUrlListState();
  const asOf = getParam("asOf") || todayIso();
  const [selectedParty, setSelectedParty] = useState<ApAgingPartyRow | null>(null);

  const agingQuery = useApAging({ asOf, includeItems: true, page, pageSize: PAGE_SIZE });

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setSelectedParty(null);
  }

  const currency = agingQuery.data?.functionalCurrency ?? "INR";

  const columns: DataTableColumn<ApAgingPartyRow>[] = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (
        <button
          type="button"
          className="truncate text-left text-sm font-medium text-status-info-ink hover:underline"
          onClick={() => setSelectedParty(row)}
        >
          {row.partyName}
        </button>
      ),
    },
    ...AP_AGING_BUCKETS.map<DataTableColumn<ApAgingPartyRow>>((bucket) => ({
      key: bucket,
      header: AGING_BUCKET_LABELS[bucket],
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.buckets[bucket], currency),
    })),
    {
      key: "total",
      header: "Total owed",
      className: "font-mono tabular-nums text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.totalMinor, currency),
    },
  ];

  if (!canRead) {
    return (
      <PageWrapper title="What we owe">
        <NoPermissionState permission="accounting:reports:read" />
      </PageWrapper>
    );
  }

  const rows = agingQuery.data?.parties ?? [];

  return (
    <PageWrapper
      title="What we owe"
      subtitle="Unpaid vendor bills, grouped by how late they are."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DatePicker
            value={asOf}
            onChange={(value) => setParams({ asOf: value || undefined })}
            placeholder="As at"
          />
        </div>
      }
    >
      <AgingTieOutBanner asOf={asOf} />

      <StatCardGrid cols={5} className="mb-2">
        {AP_AGING_BUCKETS.map((bucket) => (
          <StatCard
            key={bucket}
            label={AGING_BUCKET_LABELS[bucket]}
            value={formatMinorMoney(agingQuery.data?.buckets[bucket] ?? 0, currency)}
            tone={bucket === "0-30" ? "default" : bucket === "91+" ? "red" : "amber"}
            isLoading={agingQuery.isPending}
          />
        ))}
        <StatCard
          label="Owed in total"
          value={formatMinorMoney(agingQuery.data?.totalMinor ?? 0, currency)}
          tone="blue"
          isLoading={agingQuery.isPending}
        />
      </StatCardGrid>

      {agingQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't work out what you owe"
          description={getErrorMessage(agingQuery.error)}
          onRetry={() => void agingQuery.refetch()}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.partyId}
          isLoading={agingQuery.isPending}
          minWidth="900px"
          className="flex-1 min-h-0"
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="You owe nothing"
              description="Every vendor bill in the books has been settled."
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_SIZE,
            total: agingQuery.data?.totalParties ?? 0,
            onPageChange: setPage,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <VendorAgingSheet
        party={selectedParty}
        functionalCurrency={currency}
        onOpenChange={handleSheetOpenChange}
      />
    </PageWrapper>
  );
}
