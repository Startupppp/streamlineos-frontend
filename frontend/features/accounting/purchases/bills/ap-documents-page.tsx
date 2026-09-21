"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useApDocuments } from "@/hooks/api/accounting/ap";
import type { ApDocumentStatus, ApDocumentSummary, ApDocumentType } from "@/types/accounting-ap";
import { AP_STATUS_LABELS, AP_STATUS_TONES } from "../lib/ap-labels";
import { useUrlListState } from "../lib/use-url-list-state";
import { VendorPickerField } from "./vendor-picker-field";

const PAGE_SIZE = 20;

const STATUS_VALUES: readonly ApDocumentStatus[] = [
  "DRAFT",
  "POSTED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
];

function isStatus(value: string): value is ApDocumentStatus {
  return STATUS_VALUES.some((status) => status === value);
}

interface ApDocumentsPageProps {
  documentType: ApDocumentType;
  title: string;
  subtitle: string;
  createLabel: string;
  createHref: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function ApDocumentsPage({
  documentType,
  title,
  subtitle,
  createLabel,
  createHref,
  emptyTitle,
  emptyDescription,
}: ApDocumentsPageProps) {
  const router = useRouter();
  const canManage = useCan("accounting:payables:manage");

  const { getParam, setParams, page, setPage } = useUrlListState();
  const status = getParam("status");
  const partyId = getParam("vendor");
  const from = getParam("from");
  const to = getParam("to");

  const documentsQuery = useApDocuments({
    documentType,
    status: isStatus(status) ? status : undefined,
    partyId: partyId || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const pageState = usePageState({
    permission: "accounting:payables:read",
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    error: documentsQuery.error,
  });
  const handleRetry = useCallback(() => { void documentsQuery.refetch(); }, [documentsQuery]);

  function handleCreate(): void {
    router.push(createHref);
  }

  const columns: DataTableColumn<ApDocumentSummary>[] = [
    {
      key: "number",
      header: "Their number",
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/accounting/purchase-bills/${row.id}`}
            className="block truncate text-sm font-medium text-status-info-ink hover:underline"
          >
            {row.vendorDocumentNumber ?? "Not numbered"}
          </Link>
          {row.documentNumber ? (
            <p className="truncate text-dense text-muted-foreground">Ours: {row.documentNumber}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => <span className="truncate text-sm">{row.partyName}</span>,
    },
    {
      key: "issueDate",
      header: "Dated",
      className: "tabular-nums",
      cell: (row) => formatShortDate(row.issueDate),
    },
    {
      key: "dueDate",
      header: "Pay by",
      className: "tabular-nums",
      cell: (row) => (row.dueDate ? formatShortDate(row.dueDate) : "—"),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge tone={AP_STATUS_TONES[row.status]} label={AP_STATUS_LABELS[row.status]} />
      ),
    },
    {
      key: "gross",
      header: "Total",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.grossMinor, row.currency),
    },
    {
      key: "open",
      header: "Still owed",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.openMinor, row.currency),
    },
  ];

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title={title}>
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  const rows = documentsQuery.data?.items ?? [];
  const filtersActive = !!status || !!partyId || !!from || !!to;

  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleCreate}
          >
            {createLabel}
          </AnimatedIconButton>
        ) : null
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select
            value={status || "all"}
            onValueChange={(value) => setParams({ status: value === "all" ? undefined : value })}
          >
            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="all">Every status</SelectItem>
              {STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {AP_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-56 shrink-0">
            <VendorPickerField
              value={partyId}
              onChange={(value) => setParams({ vendor: value || undefined })}
            />
          </div>
          <DatePicker
            value={from}
            onChange={(value) => setParams({ from: value || undefined })}
            placeholder="From"
          />
          <DatePicker
            value={to}
            onChange={(value) => setParams({ to: value || undefined })}
            placeholder="To"
          />
        </div>
      }
    >
      <StatCardGrid cols={3} className="mb-2">
        <StatCard
          label="On this page"
          value={rows.length}
          isLoading={documentsQuery.isPending}
        />
        <StatCard
          label="Matching your filters"
          value={documentsQuery.data?.total ?? 0}
          isLoading={documentsQuery.isPending}
        />
        <StatCard
          label="Drafts not yet in the books"
          value={rows.filter((row) => row.status === "DRAFT").length}
          tone="amber"
          isLoading={documentsQuery.isPending}
        />
      </StatCardGrid>

      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={documentsQuery.isPending}
        minWidth="1000px"
        className="flex-1 min-h-0"
        emptyState={
          filtersActive ? (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="No results match your filters"
              description="Widen the dates or clear the vendor to see more."
              action={{
                label: "Clear filters",
                onClick: () =>
                  setParams({
                    status: undefined,
                    vendor: undefined,
                    from: undefined,
                    to: undefined,
                  }),
              }}
            />
          ) : (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title={emptyTitle}
              description={emptyDescription}
              action={canManage ? { label: createLabel, onClick: handleCreate } : undefined}
            />
          )
        }
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: documentsQuery.data?.total ?? 0,
          onPageChange: setPage,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />
    </PageWrapper>
  );
}
