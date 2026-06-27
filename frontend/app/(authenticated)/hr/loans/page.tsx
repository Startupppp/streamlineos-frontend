"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import {
  useSalaryLoans,
  useCreateSalaryLoan,
  useProcessSalaryLoan,
  useHrEmployees,
  type SalaryLoan,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, XCircle, Banknote, User, CalendarDays } from "lucide-react";
import { useAbility } from "@/lib/abilities-context";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { cn } from "@/lib/utils";

type LoanStatus = "ACTIVE" | "REPAID" | "APPROVED" | "REJECTED" | "PENDING";

function getStatusConfig(s: string | null) {
  if (s === "ACTIVE") {
    return {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      accent: "border-l-blue-500",
      icon: <Banknote className="h-2.5 w-2.5" />,
    };
  }
  if (s === "REPAID") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accent: "border-l-emerald-500",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (s === "APPROVED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accent: "border-l-emerald-500",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (s === "REJECTED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      accent: "border-l-rose-500",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    accent: "border-l-amber-500",
    icon: <Banknote className="h-2.5 w-2.5" />,
  };
}

export default function LoansPage() {
  const { data: loans, isLoading } = useSalaryLoans();
  const create = useCreateSalaryLoan();
  const process = useProcessSalaryLoan();
  const ability = useAbility();
  const isAdmin = ability.can("approve", "hr:expenses");
  const { data: employeesRaw } = useHrEmployees({ limit: 500 });

  const employeeOptions = useMemo<ComboboxOption[]>(() => {
    const list = (
      Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as PaginatedEmployees | undefined)?.data ?? []
    ) as Employee[];
    return list.filter((e) => e.isActive).map((e) => ({
      value: e.id,
      label:
        e.firstName && e.lastName
          ? `${e.firstName} ${e.lastName}`
          : (e.name ?? e.email),
      sublabel: e.designation ?? e.email,
    }));
  }, [employeesRaw]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [totalEmis, setTotalEmis] = useState("6");
  const [targetUserId, setTargetUserId] = useState("");

  const resetForm = useCallback(() => {
    setAmount("");
    setReason("");
    setTotalEmis("6");
    setTargetUserId("");
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value), []);
  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value), []);
  const handleTotalEmisChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTotalEmis(e.target.value), []);
  const handleRejectDialogOpenChange = useCallback((open: boolean) => { if (!open) setRejectId(null); }, []);

  const handleCreate = useCallback(() => {
    const numAmount = Number(amount);
    if (!amount || numAmount < 1000) { toast.error("Loan amount must be at least ₹1,000"); return; }
    if (numAmount > 10000000) { toast.error("Loan amount cannot exceed ₹1,00,00,000"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    const numEmis = Number(totalEmis);
    if (!Number.isInteger(numEmis) || numEmis < 1 || numEmis > 360) {
      toast.error("Number of EMIs must be a whole number between 1 and 360");
      return;
    }
    create.mutate(
      {
        amount: numAmount,
        reason: reason.trim(),
        totalEmis: numEmis,
        userId: isAdmin && targetUserId ? targetUserId : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Loan request submitted");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [amount, reason, totalEmis, targetUserId, isAdmin, create, resetForm]);

  const handleApprove = useCallback(
    (id: number) => {
      process.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Loan approved"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [process],
  );

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate(
      { id: rejectId, status: "REJECTED" },
      {
        onSuccess: () => {
          toast.success("Loan rejected");
          setRejectId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [rejectId, process]);

  if (isLoading) {
    return (
      <PageWrapper title="Salary Loans" subtitle="Loan requests and repayment tracking">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary Loans"
      subtitle="Request salary advances and track repayments"
      badge={`${loans?.length ?? 0} loans`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Request Loan
        </Button>
      }
    >
      {!loans?.length ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <EmptyState
            illustration={<Banknote className="h-8 w-8 text-muted-foreground" />}
            title="No salary loans on record"
            description="Submit a salary advance request to get started."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {loans.map((loan: SalaryLoan) => {
            const statusCfg = getStatusConfig(loan.status);
            const paidEmis = loan.paidEmis ?? 0;
            const totalEmisNum = loan.totalEmis ?? 1;
            const repaymentPct = totalEmisNum > 0 ? Math.round((paidEmis / totalEmisNum) * 100) : 0;
            const principalNum = Number(loan.amount);
            const emiAmountNum = loan.emiAmount ? Number(loan.emiAmount) : null;
            const remaining = emiAmountNum ? emiAmountNum * (totalEmisNum - paidEmis) : null;

            return (
              <Card
                key={loan.id}
                className={cn(
                  "rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4",
                  statusCfg.accent,
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                        <Banknote className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-bold tabular-nums text-foreground">
                          ₹{principalNum.toLocaleString("en-IN")}
                        </p>
                        {loan.reason && (
                          <p className="text-[11px] text-muted-foreground truncate">{loan.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
                        {statusCfg.icon}
                        {loan.status ?? "PENDING"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {loan.user?.name && (
                      <span className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {loan.user.name}
                      </span>
                    )}
                    {loan.totalEmis && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {paidEmis}/{totalEmisNum} EMIs paid
                      </span>
                    )}
                    {emiAmountNum && (
                      <span className="font-medium text-foreground/70">
                        ₹{emiAmountNum.toLocaleString("en-IN")}/mo
                      </span>
                    )}
                    {loan.createdAt && (
                      <span>{format(new Date(loan.createdAt), "MMM d, yyyy")}</span>
                    )}
                  </div>

                  {(loan.status === "ACTIVE" || loan.status === "APPROVED") && loan.totalEmis && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Repayment progress</span>
                        <span>
                          {repaymentPct}%
                          {remaining !== null && (
                            <span className="ml-1 text-foreground/60">
                              · ₹{remaining.toLocaleString("en-IN")} remaining
                            </span>
                          )}
                        </span>
                      </div>
                      <Progress value={repaymentPct} className="h-1.5 bg-muted" />
                    </div>
                  )}

                  {isAdmin && loan.status === "PENDING" && (
                    <div className="flex gap-1.5 pt-1 border-t border-border/50">
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => handleApprove(loan.id)}
                        disabled={process.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setRejectId(loan.id)}
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Request Salary Loan"
        onSubmit={handleCreate}
        submitLabel="Submit"
        isPending={create.isPending}
      >
        {isAdmin && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Employee{" "}
              <span className="text-muted-foreground font-normal">(optional — defaults to yourself)</span>
            </label>
            <Combobox
              options={employeeOptions}
              value={targetUserId}
              onChange={setTargetUserId}
              placeholder="Select employee…"
              searchPlaceholder="Search by name…"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Loan Amount (₹) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="1000"
            max="10000000"
            step="1"
            placeholder="Min ₹1,000"
            value={amount}
            onChange={handleAmountChange}
          />
          <p className="text-xs text-muted-foreground">Between ₹1,000 and ₹1,00,00,000</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Why do you need this loan?"
            value={reason}
            onChange={handleReasonChange}
            rows={3}
            maxLength={500}
            className="resize-none w-full"
          />
          <p className="text-xs text-muted-foreground text-right">{reason.length} / 500</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Number of EMIs <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="1"
            max="360"
            step="1"
            placeholder="e.g. 6"
            value={totalEmis}
            onChange={handleTotalEmisChange}
          />
          <p className="text-xs text-muted-foreground">Between 1 and 360 months</p>
        </div>
      </HrSheet>

      <ConfirmDialog
        open={rejectId !== null}
        onOpenChange={handleRejectDialogOpenChange}
        title="Reject Loan"
        description="Are you sure you want to reject this loan request?"
        confirmLabel="Reject"
        destructive
        onConfirm={handleReject}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}
