"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Users, FileCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useTaxDeclarationsAdmin, useExportTaxReport } from "@/hooks/api/payroll/tax-admin";
import { useCan } from "@/hooks/api/access";
import type { TaxDeclarationAdmin } from "@/types/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

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

function calcTotal(d: TaxDeclarationAdmin): number {
  return d.hra + d.lta + d.section80c + d.section80d + d.section80g + d.homeLoanInterest;
}

export function TaxReportTab() {
  const canExport = useCan("payroll:reports:export");
  const [fy, setFY] = useState(getCurrentFY);
  const exportMutation = useExportTaxReport();
  const { data, isLoading } = useTaxDeclarationsAdmin({ financialYear: fy });

  const declarations = data ?? [];
  const submitted = declarations.filter((d) => d.status === "SUBMITTED").length;
  const verified = declarations.filter((d) => d.status === "VERIFIED").length;
  const pending = declarations.filter((d) => d.status === "DRAFT").length;
  const fyOptions = getFYOptions();

  function handleFYChange(value: string) {
    setFY(value);
  }

  function handleExportClick() {
    exportMutation.mutate(
      { financialYear: fy },
      { onError: () => toast.error("Export failed") },
    );
  }

  const columns: DataTableColumn<TaxDeclarationAdmin>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium">{row.userName}</span>
          <span className="text-[10px] text-muted-foreground">{row.userEmail}</span>
        </div>
      ),
    },
    {
      key: "regime",
      header: "Regime",
      cell: (row) => <span className="text-[11px]">{row.regime}</span>,
    },
    {
      key: "total",
      header: "Total Declared",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-[11px] font-medium">{formatMoney(calcTotal(row))}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <span className="text-[11px] capitalize">{row.status.toLowerCase()}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={fy} onValueChange={handleFYChange}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fyOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canExport && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleExportClick}
            disabled={exportMutation.isPending}
          >
            <Download className="h-3.5 w-3.5" />
            Export Tax Report CSV
          </Button>
        )}
      </div>

      <StatCardGrid cols={4}>
        <StatCard label="Total Declarations" value={declarations.length} icon={Users} />
        <StatCard label="Submitted" value={submitted} icon={FileCheck} tone="blue" />
        <StatCard label="Verified" value={verified} icon={FileCheck} tone="emerald" />
        <StatCard label="Pending (Draft)" value={pending} icon={Clock} tone="amber" />
      </StatCardGrid>

      <DataTable
        data={declarations}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No declarations for this period"
            description="Tax declarations for the selected financial year will appear here"
          />
        }
      />
    </div>
  );
}
