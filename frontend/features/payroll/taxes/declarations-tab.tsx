"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useTaxDeclarationsAdmin, useExportTaxReport } from "@/hooks/api/payroll/tax-admin";
import { useCan } from "@/hooks/api/access";
import type { TaxDeclarationStatus } from "@/types/payroll/reports";
import type { TaxDeclarationListItem } from "@/hooks/api/payroll/tax-schema";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { DeclarationReviewSheet } from "./declaration-review-sheet";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  VERIFIED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
};

const REGIME_BADGE: Record<string, string> = {
  NEW: "bg-primary/10 text-foreground border-primary/20",
  OLD: "bg-muted text-muted-foreground border-border",
};

const STATUS_OPTIONS: { value: TaxDeclarationStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
];

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getFYOptions(): string[] {
  const now = new Date();
  const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return [
    `${year}-${String(year + 1).slice(2)}`,
    `${year - 1}-${String(year).slice(2)}`,
    `${year - 2}-${String(year - 1).slice(2)}`,
  ];
}


function calcTotal(d: TaxDeclarationListItem): number {
  return parseFloat(d.hra) + parseFloat(d.lta) + parseFloat(d.section80c) + parseFloat(d.section80d) + parseFloat(d.section80g) + parseFloat(d.homeLoanInterest);
}

export function DeclarationsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canExport = useCan("payroll:reports:export");

  const fyParam = searchParams.get("fy") ?? "all";
  const statusParam = searchParams.get("status") ?? "all";

  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclarationListItem | null>(null);
  const exportMutation = useExportTaxReport();

  const { data, isLoading, isError, error, refetch } = useTaxDeclarationsAdmin({
    financialYear: fyParam !== "all" ? fyParam : undefined,
    status: statusParam !== "all" ? statusParam : undefined,
  });

  const filtersActive = fyParam !== "all" || statusParam !== "all";

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("fy");
    params.delete("status");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function handleFYChange(value: string) {
    updateParam("fy", value);
  }

  function handleStatusChange(value: string) {
    updateParam("status", value);
  }

  function handleRowClick(row: TaxDeclarationListItem) {
    setSelectedDeclaration(row);
  }

  function handleSheetClose() {
    setSelectedDeclaration(null);
  }

  function handleExportClick() {
    const fy = fyParam !== "all" ? fyParam : getCurrentFY();
    exportMutation.mutate(
      { financialYear: fy },
      { onError: () => toast.error("Export failed") },
    );
  }

  const fyOptions = getFYOptions();

  const columns: DataTableColumn<TaxDeclarationListItem>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.userName ?? ""} className="text-dense font-medium" />
          <TruncatedText text={row.userEmail ?? ""} className="text-micro text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "financialYear",
      header: "FY",
      cell: (row) => <span className="text-dense">{row.financialYear}</span>,
    },
    {
      key: "regime",
      header: "Regime",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${REGIME_BADGE[row.regime] ?? ""}`}
        >
          {row.regime}
        </span>
      ),
    },
    {
      key: "section80c",
      header: "80C",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense">{formatMoney(row.section80c)}</span>
      ),
    },
    {
      key: "section80d",
      header: "80D",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense">{formatMoney(row.section80d)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense font-medium">{formatMoney(calcTotal(row))}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${STATUS_BADGE[row.status]}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{formatShortDate(row.createdAt)}</span>
      ),
    },
  ];

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load declarations"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <DataTable
        className="flex-1 min-h-0"
        data={data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="860px"
        toolbar={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={fyParam} onValueChange={handleFYChange}>
              <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-28`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {fyOptions.map((fy) => (
                  <SelectItem key={fy} value={fy}>
                    {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusParam} onValueChange={handleStatusChange}>
              <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-28`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canExport && (
              <AnimatedIconButton
                icon={DownloadIcon}
                iconClassName="mr-1.5"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleExportClick}
                disabled={exportMutation.isPending}
              >
                Export CSV
              </AnimatedIconButton>
            )}
          </div>
        }
        emptyState={
          <EmptyState
            illustration={<EmptyApprovalIllustration />}
            title="No declarations yet"
            description={
              filtersActive
                ? undefined
                : "Declarations submitted by employees will appear here"
            }
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
          />
        }
      />

      {selectedDeclaration && (
        <DeclarationReviewSheet
          declaration={selectedDeclaration}
          onClose={handleSheetClose}
        />
      )}
    </>
  );
}
