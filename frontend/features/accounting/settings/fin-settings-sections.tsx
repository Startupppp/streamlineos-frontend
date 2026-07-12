"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteApprovalPolicy } from "@/hooks/api/accounting/settings";
import { useUpdatePaymentTerms } from "@/hooks/api/accounting/fin-settings";
import type { NumberSequence, SystemAccountMapping, SystemAccountPurpose, PaymentTerm } from "@/types/accounting/fin-settings";
import type { ApprovalPolicy, ExchangeRate } from "@/types/accounting/taxes";
import {
  SequenceEditDialog,
  SystemAccountMapDialog,
  PolicyDialog,
  RateDialog,
  PaymentTermDialog,
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

interface SequenceEditRowProps {
  seq: NumberSequence;
  canManage: boolean;
  onEdit: (s: NumberSequence) => void;
}

function SequenceEditRow({ seq, canManage, onEdit }: SequenceEditRowProps) {
  function handleEdit(): void {
    onEdit(seq);
  }

  return (
    <TableRow className="border-b border-border/50 hover:bg-muted/30">
      <TableCell className="text-xs px-3 py-2 font-mono capitalize">{seq.entityType.replace(/_/g, " ")}</TableCell>
      <TableCell className="text-xs px-3 py-2 font-mono">{seq.prefix}</TableCell>
      <TableCell className="text-xs px-3 py-2 tabular-nums">{seq.padding}</TableCell>
      <TableCell className="text-xs px-3 py-2 tabular-nums">{seq.nextNumber}</TableCell>
      {canManage && (
        <TableCell className="px-2 py-2">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export interface SequencesSectionProps {
  sequences: NumberSequence[];
  canManage: boolean;
}

export function SequencesSection({ sequences, canManage }: SequencesSectionProps) {
  const [editSeq, setEditSeq] = useState<NumberSequence | null>(null);

  function handleSeqDialogOpenChange(v: boolean): void {
    if (!v) setEditSeq(null);
  }

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
                  <SequenceEditRow key={seq.entityType} seq={seq} canManage={canManage} onEdit={setEditSeq} />
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
          onOpenChange={handleSeqDialogOpenChange}
        />
      )}
    </>
  );
}

interface SystemAccountRowProps {
  mapping: SystemAccountMapping;
  canManage: boolean;
  onMap: (m: SystemAccountMapping) => void;
}

function SystemAccountRow({ mapping, canManage, onMap }: SystemAccountRowProps) {
  function handleMap(): void {
    onMap(mapping);
  }

  return (
    <TableRow className={cn("border-b border-border/50 hover:bg-muted/30", !mapping.accountId && "bg-amber-50/60")}>
      <TableCell className="text-xs px-3 py-2">{PURPOSE_LABELS[mapping.purpose]}</TableCell>
      <TableCell className="text-xs px-3 py-2">
        {mapping.account ? (
          <span className="font-mono">{mapping.account.code} — {mapping.account.name}</span>
        ) : (
          <span className="text-amber-600 font-medium">Not mapped</span>
        )}
      </TableCell>
      {canManage && (
        <TableCell className="px-2 py-2">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMap}>Map</Button>
        </TableCell>
      )}
    </TableRow>
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
                  <SystemAccountRow key={m.purpose} mapping={m} canManage={canManage} onMap={setEditMapping} />
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
          onOpenChange={handleMappingDialogOpenChange}
        />
      )}
    </>
  );
}

interface PolicyRowProps {
  policy: ApprovalPolicy;
  canManage: boolean;
  isDeleting: boolean;
  onEdit: (p: ApprovalPolicy) => void;
  onDelete: (id: number) => void;
}

function PolicyRow({ policy, canManage, isDeleting, onEdit, onDelete }: PolicyRowProps) {
  function handleEdit(): void {
    onEdit(policy);
  }

  function handleDelete(): void {
    onDelete(policy.id);
  }

  return (
    <TableRow className="border-b border-border/50 hover:bg-muted/30">
      <TableCell className="text-xs px-3 py-2 font-mono">{policy.recordType.replace(/_/g, " ")}</TableCell>
      <TableCell className="text-xs px-3 py-2 tabular-nums">{policy.minAmount ?? "—"}</TableCell>
      <TableCell className="text-xs px-3 py-2">{policy.approverRole ?? "—"}</TableCell>
      <TableCell className="px-3 py-2">
        <Badge variant={policy.isActive ? "default" : "secondary"} className="text-[10px]">
          {policy.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      {canManage && (
        <TableCell className="px-2 py-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
            <LoadingButton
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              isPending={isDeleting}
            >
              Delete
            </LoadingButton>
          </div>
        </TableCell>
      )}
    </TableRow>
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

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Approval Policies</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs" onClick={handleAddPolicyOpen}>Add policy</Button>
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
                  <PolicyRow
                    key={p.id}
                    policy={p}
                    canManage={canManage}
                    isDeleting={deletePolicy.isPending}
                    onEdit={setEditPolicy}
                    onDelete={handleDeletePolicy}
                  />
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

export interface PaymentTermsSectionProps {
  terms: PaymentTerm[];
  canManage: boolean;
}

interface PaymentTermRowProps {
  term: PaymentTerm;
  existingTerms: PaymentTerm[];
  canManage: boolean;
  onEdit: (t: PaymentTerm) => void;
  onDelete: (key: string) => void;
  isDeleting: boolean;
}

function PaymentTermRow({ term, existingTerms, canManage, onEdit, onDelete, isDeleting }: PaymentTermRowProps) {
  function handleEdit(): void {
    onEdit(term);
  }

  function handleDelete(): void {
    onDelete(term.key);
  }

  return (
    <TableRow className="border-b border-border/50 hover:bg-muted/30">
      <TableCell className="text-xs px-3 py-2">{term.label}</TableCell>
      <TableCell className="text-xs px-3 py-2 tabular-nums">{term.days} days</TableCell>
      <TableCell className="px-3 py-2">
        {term.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
      </TableCell>
      {canManage && (
        <TableCell className="px-2 py-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
            <LoadingButton
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              isPending={isDeleting}
            >
              Delete
            </LoadingButton>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function PaymentTermsSection({ terms, canManage }: PaymentTermsSectionProps) {
  const [editTerm, setEditTerm] = useState<PaymentTerm | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const updateTerms = useUpdatePaymentTerms();

  function handleOpenAdd(): void {
    setAddOpen(true);
  }

  function handleCloseDialog(v: boolean): void {
    if (!v) { setAddOpen(false); setEditTerm(null); }
  }

  function handleRequestDelete(key: string): void {
    setDeleteKey(key);
  }

  function handleCancelDelete(): void {
    setDeleteKey(null);
  }

  function handleConfirmDelete(): void {
    if (!deleteKey) return;
    const filtered = terms.filter((t) => t.key !== deleteKey);
    updateTerms.mutate(
      { terms: filtered },
      {
        onSuccess: () => { toast.success("Payment term deleted"); setDeleteKey(null); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Payment Terms</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs" onClick={handleOpenAdd}>Add term</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Label</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Days</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-12">Default</TableHead>
                  {canManage && <TableHead className="w-28 px-2 py-2" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="text-center text-xs text-muted-foreground py-6">
                      No payment terms configured.
                    </TableCell>
                  </TableRow>
                )}
                {terms.map((t) => (
                  <PaymentTermRow
                    key={t.key}
                    term={t}
                    existingTerms={terms}
                    canManage={canManage}
                    onEdit={setEditTerm}
                    onDelete={handleRequestDelete}
                    isDeleting={updateTerms.isPending && deleteKey === t.key}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaymentTermDialog
        term={editTerm ?? null}
        existingTerms={terms}
        open={addOpen || editTerm !== null}
        onOpenChange={handleCloseDialog}
      />

      <AlertDialog open={deleteKey !== null} onOpenChange={(v) => { if (!v) handleCancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment term?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment term. Any existing invoices or bills using this term will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
