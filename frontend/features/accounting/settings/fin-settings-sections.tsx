"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useDeleteApprovalPolicy } from "@/hooks/api/accounting/settings";
import type { NumberSequence, SystemAccountMapping, SystemAccountPurpose } from "@/types/accounting/fin-settings";
import type { ApprovalPolicy, ExchangeRate } from "@/types/accounting/taxes";
import {
  SequenceEditDialog,
  SystemAccountMapDialog,
  PolicyDialog,
  RateDialog,
} from "./fin-settings-dialogs";

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
};

export interface SequencesSectionProps {
  sequences: NumberSequence[];
  canManage: boolean;
}

export function SequencesSection({ sequences, canManage }: SequencesSectionProps) {
  const [editSeq, setEditSeq] = useState<NumberSequence | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Numbering Sequences</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Entity type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Prefix</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Padding</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Next #</TableHead>
                  {canManage && <TableHead className="w-16 px-2 py-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => (
                  <TableRow key={seq.entityType} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-xs px-3 py-2 font-mono capitalize">{seq.entityType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs px-3 py-2 font-mono">{seq.prefix}</TableCell>
                    <TableCell className="text-xs px-3 py-2 tabular-nums">{seq.padding}</TableCell>
                    <TableCell className="text-xs px-3 py-2 tabular-nums">{seq.nextNumber}</TableCell>
                    {canManage && (
                      <TableCell className="px-2 py-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditSeq(seq)}>Edit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editSeq && (
        <SequenceEditDialog
          seq={editSeq}
          open={!!editSeq}
          onOpenChange={(v) => { if (!v) setEditSeq(null); }}
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

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">System Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Purpose</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Mapped account</TableHead>
                  {canManage && <TableHead className="w-16 px-2 py-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemAccounts.map((m) => (
                  <TableRow
                    key={m.purpose}
                    className={cn("border-b border-border/50 hover:bg-muted/30", !m.accountId && "bg-amber-50/60")}
                  >
                    <TableCell className="text-xs px-3 py-2">{PURPOSE_LABELS[m.purpose]}</TableCell>
                    <TableCell className="text-xs px-3 py-2">
                      {m.account ? (
                        <span className="font-mono">{m.account.code} — {m.account.name}</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Not mapped</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="px-2 py-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditMapping(m)}>Map</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editMapping && (
        <SystemAccountMapDialog
          mapping={editMapping}
          open={!!editMapping}
          onOpenChange={(v) => { if (!v) setEditMapping(null); }}
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

  function handleDeletePolicy(id: number) {
    deletePolicy.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleClosePolicyDialog(v: boolean) {
    if (!v) { setAddPolicyOpen(false); setEditPolicy(undefined); }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Approval Policies</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs" onClick={() => setAddPolicyOpen(true)}>Add policy</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Record type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Min amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Approver role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Active</TableHead>
                  {canManage && <TableHead className="w-28 px-2 py-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center text-xs text-muted-foreground py-6">
                      No approval policies configured.
                    </TableCell>
                  </TableRow>
                )}
                {policies.map((p) => (
                  <TableRow key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-xs px-3 py-2 font-mono">{p.recordType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs px-3 py-2 tabular-nums">{p.minAmount ?? "—"}</TableCell>
                    <TableCell className="text-xs px-3 py-2">{p.approverRole ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="px-2 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditPolicy(p)}>Edit</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeletePolicy(p.id)}
                            disabled={deletePolicy.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Exchange Rates</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs" onClick={() => setAddRateOpen(true)}>Add rate</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">From</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">To</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">As of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                      No exchange rates configured.
                    </TableCell>
                  </TableRow>
                )}
                {rates.map((r) => (
                  <TableRow key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-xs px-3 py-2 font-mono uppercase">{r.fromCurrency}</TableCell>
                    <TableCell className="text-xs px-3 py-2 font-mono uppercase">{r.toCurrency}</TableCell>
                    <TableCell className="text-xs px-3 py-2 tabular-nums">{r.rate}</TableCell>
                    <TableCell className="text-xs px-3 py-2 text-muted-foreground">
                      {new Date(r.asOfDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
