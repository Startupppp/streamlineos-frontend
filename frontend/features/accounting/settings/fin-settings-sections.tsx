"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteApprovalPolicy } from "@/hooks/api/accounting/settings";
import type { NumberSequence, SystemAccountMapping, SystemAccountPurpose } from "@/types/accounting/fin-settings";
import type { ApprovalPolicy, ExchangeRate } from "@/types/accounting/taxes";
import {
  SequenceEditDialog,
  SystemAccountMapDialog,
  PolicyDialog,
  RateDialog,
} from "./fin-settings-dialogs";

export type { PaymentTermsSectionProps } from "./payment-terms-section";
export { PaymentTermsSection } from "./payment-terms-section";

export const PURPOSE_LABELS: Record<SystemAccountPurpose, string> = {
  AR: "Accounts Receivable",
  AP: "Accounts Payable",
  BANK_CLEARING: "Bank Clearing",
  SALES_INCOME: "Sales Income",
  DISCOUNT_GIVEN: "Discount Given",
  TAX_PAYABLE: "Tax Payable",
  TAX_RECEIVABLE: "Tax Receivable",
  PAYROLL_PAYABLE: "Payroll Payable",
  EXPENSE_CLEARING: "Expense Clearing",
  RETAINED_EARNINGS: "Retained Earnings",
  OWNER_EQUITY: "Owner Equity",
  PAYMENT_FEES: "Payment Fees",
  REIMBURSEMENT_PAYABLE: "Reimbursement Payable",
  FX_GAIN_LOSS: "FX Gain / Loss",
  DEPRECIATION_EXPENSE: "Depreciation Expense",
  ACCUM_DEPRECIATION: "Accumulated Depreciation",
  SALARY_EXPENSE: "Salary Expense",
  ASSET_DISPOSAL_GAIN_LOSS: "Asset Disposal Gain / Loss",
};

export interface SequencesSectionProps {
  sequences: NumberSequence[];
  canManage: boolean;
}

export function SequencesSection({ sequences, canManage }: SequencesSectionProps) {
  const [editSeq, setEditSeq] = useState<NumberSequence | null>(null);

  function handleSeqDialogOpenChange(v: boolean): void {
    if (!v) setEditSeq(null);
  }

  function getSeqRowKey(seq: NumberSequence): string {
    return seq.entityType;
  }

  const baseColumns: DataTableColumn<NumberSequence>[] = [
    {
      key: "entityType",
      header: "Entity type",
      cell: (row) => (
        <span className="text-xs font-mono capitalize">{row.entityType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "prefix",
      header: "Prefix",
      cell: (row) => <span className="text-xs font-mono">{row.prefix}</span>,
    },
    {
      key: "padding",
      header: "Padding",
      cell: (row) => <span className="text-xs tabular-nums">{row.padding}</span>,
    },
    {
      key: "nextNumber",
      header: "Next #",
      cell: (row) => <span className="text-xs tabular-nums">{row.nextNumber}</span>,
    },
  ];

  const actionsColumn: DataTableColumn<NumberSequence> = {
    key: "actions",
    header: "",
    cell: (row) => (
      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditSeq(row)}>
        Edit
      </Button>
    ),
  };

  const columns = useMemo(
    () => (canManage ? [...baseColumns, actionsColumn] : baseColumns),
    [canManage],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Numbering Sequences</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sequences}
            columns={columns}
            getRowKey={getSeqRowKey}
            className="rounded-none border-0"
          />
        </CardContent>
      </Card>

      {editSeq && (
        <SequenceEditDialog
          seq={editSeq}
          open={!!editSeq}
          onOpenChange={handleSeqDialogOpenChange}
        />
      )}
    </>
  );
}

export interface SystemAccountsSectionProps {
  systemAccounts: SystemAccountMapping[];
  canManage: boolean;
}

export function SystemAccountsSection({ systemAccounts, canManage }: SystemAccountsSectionProps) {
  const [editMapping, setEditMapping] = useState<SystemAccountMapping | null>(null);

  function handleMappingDialogOpenChange(v: boolean): void {
    if (!v) setEditMapping(null);
  }

  function getMappingRowKey(m: SystemAccountMapping): string {
    return m.purpose;
  }

  function getMappingRowClassName(m: SystemAccountMapping): string {
    return !m.accountId ? "bg-amber-50/60 dark:bg-amber-500/10" : "";
  }

  const baseColumns: DataTableColumn<SystemAccountMapping>[] = [
    {
      key: "purpose",
      header: "Purpose",
      cell: (row) => <span className="text-xs">{PURPOSE_LABELS[row.purpose]}</span>,
    },
    {
      key: "account",
      header: "Mapped account",
      cell: (row) =>
        row.account ? (
          <span className="text-xs font-mono">
            {row.account.code} – {row.account.name}
          </span>
        ) : (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Not mapped</span>
        ),
    },
  ];

  const actionsColumn: DataTableColumn<SystemAccountMapping> = {
    key: "actions",
    header: "",
    cell: (row) => (
      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditMapping(row)}>
        Map
      </Button>
    ),
  };

  const columns = useMemo(
    () => (canManage ? [...baseColumns, actionsColumn] : baseColumns),
    [canManage],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">System Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={systemAccounts}
            columns={columns}
            getRowKey={getMappingRowKey}
            rowClassName={getMappingRowClassName}
            className="rounded-none border-0"
          />
        </CardContent>
      </Card>

      {editMapping && (
        <SystemAccountMapDialog
          mapping={editMapping}
          open={!!editMapping}
          onOpenChange={handleMappingDialogOpenChange}
        />
      )}
    </>
  );
}

export interface PoliciesSectionProps {
  policies: ApprovalPolicy[];
  canManage: boolean;
}

export function PoliciesSection({ policies, canManage }: PoliciesSectionProps) {
  const [editPolicy, setEditPolicy] = useState<ApprovalPolicy | undefined>(undefined);
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const deletePolicy = useDeleteApprovalPolicy();

  function handleDeletePolicy(id: number): void {
    deletePolicy.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleClosePolicyDialog(v: boolean): void {
    if (!v) { setAddPolicyOpen(false); setEditPolicy(undefined); }
  }

  function handleAddPolicyOpen(): void {
    setAddPolicyOpen(true);
  }

  function getPolicyRowKey(p: ApprovalPolicy): number {
    return p.id;
  }

  const baseColumns: DataTableColumn<ApprovalPolicy>[] = [
    {
      key: "recordType",
      header: "Record type",
      cell: (row) => (
        <span className="text-xs font-mono">{row.recordType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "minAmount",
      header: "Min amount",
      cell: (row) => <span className="text-xs tabular-nums">{row.minAmount ?? "—"}</span>,
    },
    {
      key: "approverRole",
      header: "Approver role",
      cell: (row) => <span className="text-xs">{row.approverRole ?? "—"}</span>,
    },
    {
      key: "isActive",
      header: "Active",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"} className="text-[10px]">
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const actionsColumn: DataTableColumn<ApprovalPolicy> = {
    key: "actions",
    header: "",
    cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditPolicy(row)}>
          Edit
        </Button>
        <LoadingButton
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-destructive hover:text-destructive"
          onClick={() => handleDeletePolicy(row.id)}
          isPending={deletePolicy.isPending}
        >
          Delete
        </LoadingButton>
      </div>
    ),
  };

  const columns = useMemo(
    () => (canManage ? [...baseColumns, actionsColumn] : baseColumns),
    [canManage, deletePolicy.isPending],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Approval Policies</CardTitle>
          {canManage && (
            <Button size="sm" className="text-xs" onClick={handleAddPolicyOpen}>Add policy</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={policies}
            columns={columns}
            getRowKey={getPolicyRowKey}
            className="rounded-none border-0"
            emptyState={
              <p className="text-center text-xs text-muted-foreground py-6">
                No approval policies configured.
              </p>
            }
          />
        </CardContent>
      </Card>

      <PolicyDialog
        policy={editPolicy ?? null}
        open={addPolicyOpen || editPolicy !== undefined}
        onOpenChange={handleClosePolicyDialog}
      />
    </>
  );
}

export interface ExchangeRatesSectionProps {
  rates: ExchangeRate[];
  canManage: boolean;
}

export function ExchangeRatesSection({ rates, canManage }: ExchangeRatesSectionProps) {
  const [addRateOpen, setAddRateOpen] = useState(false);

  function handleAddRateOpen(): void {
    setAddRateOpen(true);
  }

  function getRateRowKey(r: ExchangeRate): number {
    return r.id;
  }

  const columns: DataTableColumn<ExchangeRate>[] = [
    {
      key: "fromCurrency",
      header: "From",
      cell: (row) => <span className="text-xs font-mono uppercase">{row.fromCurrency}</span>,
    },
    {
      key: "toCurrency",
      header: "To",
      cell: (row) => <span className="text-xs font-mono uppercase">{row.toCurrency}</span>,
    },
    {
      key: "rate",
      header: "Rate",
      cell: (row) => <span className="text-xs tabular-nums">{row.rate}</span>,
    },
    {
      key: "asOfDate",
      header: "As of",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.asOfDate).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Exchange Rates</CardTitle>
          {canManage && (
            <Button size="sm" className="text-xs" onClick={handleAddRateOpen}>Add rate</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={rates}
            columns={columns}
            getRowKey={getRateRowKey}
            className="rounded-none border-0"
            emptyState={
              <p className="text-center text-xs text-muted-foreground py-6">
                No exchange rates configured.
              </p>
            }
          />
        </CardContent>
      </Card>

      <RateDialog open={addRateOpen} onOpenChange={setAddRateOpen} />
    </>
  );
}

export function QuickLinks() {
  return (
    <div className="flex gap-3">
      <Link
        href="/accounting/period-close"
        className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        Period Close →
      </Link>
      <Link
        href="/accounting/audit"
        className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        Audit →
      </Link>
    </div>
  );
}
