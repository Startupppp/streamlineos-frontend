"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useTaxDeclarationsAdmin, useExportTaxReport } from "@/hooks/api/payroll/tax-admin";
import { useCan } from "@/hooks/api/access";
import type { TaxDeclarationAdmin, TaxDeclarationStatus } from "@/types/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { DeclarationReviewSheet } from "./declaration-review-sheet";

const STATUS_BADGE: Record<TaxDeclarationStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
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

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcTotal(d: TaxDeclarationAdmin): number {
  return d.hra + d.lta + d.section80c + d.section80d + d.section80g + d.homeLoanInterest;
}

export function DeclarationsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canExport = useCan("payroll:reports:export");

  const fyParam = searchParams.get("fy") ?? "all";
  const statusParam = searchParams.get("status") ?? "all";

  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclarationAdmin | null>(null);
  const exportMutation = useExportTaxReport();

  const { data, isLoading } = useTaxDeclarationsAdmin({
    financialYear: fyParam !== "all" ? fyParam : undefined,
    status: statusParam !== "all" ? statusParam : undefined,
  });

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

  function handleRowClick(row: TaxDeclarationAdmin) {
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

  const columns: DataTableColumn<TaxDeclarationAdmin>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.userName} className="text-[11px] font-medium" />
          <TruncatedText text={row.userEmail} className="text-[10px] text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "financialYear",
      header: "FY",
      cell: (row) => <span className="text-[11px]">{row.financialYear}</span>,
    },
    {
      key: "regime",
      header: "Regime",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${REGIME_BADGE[row.regime] ?? ""}`}
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
        <span className="font-mono tabular-nums text-[11px]">{formatMoney(row.section80c)}</span>
      ),
    },
    {
      key: "section80d",
      header: "80D",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-[11px]">{formatMoney(row.section80d)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-[11px] font-medium">{formatMoney(calcTotal(row))}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BADGE[row.status]}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">{formatDateShort(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={data ?? []}
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
            title="No declarations found"
            description="Declarations submitted by employees will appear here"
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
