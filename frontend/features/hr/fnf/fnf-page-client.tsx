"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import { HrSheet } from "@/components/shared/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useFnfSettlements,
  useCreateFnfSettlement,
  useCompleteFnfSettlement,
  type FnfSettlement,
} from "@/hooks/api/hr/fnf";

function isInReview(status: string | null): boolean {
  return status === "PENDING_APPROVAL" || status === "HR_REVIEW" || status === "FINANCE_REVIEW";
}

function fnfStatusBadgeClass(status: string | null): string {
  if (status === "PAID") return "bg-status-success-surface text-status-success-ink border-status-success-rule";
  if (status === "APPROVED") return "bg-status-info-surface text-status-info-ink border-status-info-rule";
  if (isInReview(status)) return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  return "bg-muted text-muted-foreground border-border";
}

function fnfStatusLabel(status: string | null): string {
  if (status === "PAID") return "Paid";
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "HR_REVIEW") return "HR review";
  if (status === "FINANCE_REVIEW") return "Finance review";
  return "Draft";
}

function fnfBorderClass(status: string | null): string {
  if (status === "PAID") return "border-l-status-success-rule";
  if (status === "APPROVED") return "border-l-status-info-rule";
  if (isInReview(status)) return "border-l-status-warning-rule";
  return "border-l-border";
}

interface FnfCardProps {
  item: FnfSettlement;
  onMarkPaid: (id: number) => void;
  /** PATCH /hr/fnf/:id needs hr:exit:manage. */
  canMarkPaid: boolean;
  isPending: boolean;
  money: MoneyDisplay;
}

function FnfCard({ item, onMarkPaid, canMarkPaid, isPending, money }: FnfCardProps) {
  const handleMarkPaid = useCallback(() => onMarkPaid(item.id), [item.id, onMarkPaid]);

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden border-l-4 transition-colors duration-200",
        fnfBorderClass(item.status)
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
              item.status === "PAID"
                ? "bg-status-success-surface"
                : item.status === "APPROVED"
                  ? "bg-status-info-surface"
                  : isInReview(item.status)
                    ? "bg-status-warning-surface"
                    : "bg-muted"
            )}
          >
            <FileSpreadsheet
              className={cn(
                "h-3.5 w-3.5",
                item.status === "PAID"
                  ? "text-status-success-ink"
                  : item.status === "APPROVED"
                    ? "text-status-info-ink"
                    : isInReview(item.status)
                      ? "text-status-warning-ink"
                      : "text-muted-foreground"
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.user?.name && (
                <TruncatedText text={item.user.name} className="text-sm font-semibold text-foreground" />
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border shrink-0",
                  fnfStatusBadgeClass(item.status)
                )}
              >
                {fnfStatusLabel(item.status)}
              </span>
            </div>

            <div className="flex gap-3 text-micro text-muted-foreground mt-1 flex-wrap">
              {item.netPayable && (
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(item.netPayable, money)} net payable
                </span>
              )}
              {item.deductions && Number(item.deductions) > 0 && (
                <span className="text-status-danger-ink tabular-nums">
                  −{formatMoney(item.deductions, money)} deductions
                </span>
              )}
              {item.loanRecovery && Number(item.loanRecovery) > 0 && (
                <span className="tabular-nums">
                  Loan: {formatMoney(item.loanRecovery, money)}
                </span>
              )}
              {item.createdAt && (
                <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
              )}
            </div>

            {item.notes && (
              <TruncatedText text={item.notes} className="text-xs text-muted-foreground mt-1" />
            )}
          </div>

          {/* The backend allows only APPROVED → PAID; any other status answers 409. */}
          {canMarkPaid && item.status === "APPROVED" && (
            <LoadingButton
              size="sm"
              variant="outline"
              className="text-xs shrink-0 gap-1.5"
              onClick={handleMarkPaid}
              isPending={isPending}
            >
              {!isPending && <CheckCircle2 className="h-3 w-3" />}
              Mark paid
            </LoadingButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FnfPageClient() {
  const { data: items, isLoading, isError, error, refetch } = useFnfSettlements();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const pageState = usePageState({ permission: "hr:payroll:view", isLoading, isError, error });
  const canCreate = useCan("hr:exit:manage");
  const money = useOrgDisplay();

  const create = useCreateFnfSettlement();
  const complete = useCompleteFnfSettlement();

  const [sheetOpen, setSheetOpen] = useState(false);

  const [completeId, setCompleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [basicDues, setBasicDues] = useState("");
  const [leaveEncashment, setLeaveEncashment] = useState("");
  const [bonusDue, setBonusDue] = useState("");
  const [deductions, setDeductions] = useState("");
  const [loanRecovery, setLoanRecovery] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    setUserId("");
    setBasicDues("");
    setLeaveEncashment("");
    setBonusDue("");
    setDeductions("");
    setLoanRecovery("");
    setNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      {
        userId,
        basicDues: basicDues ? Number(basicDues) : undefined,
        leaveEncashment: leaveEncashment ? Number(leaveEncashment) : undefined,
        bonusDue: bonusDue ? Number(bonusDue) : undefined,
        deductions: deductions ? Number(deductions) : undefined,
        loanRecovery: loanRecovery ? Number(loanRecovery) : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Final settlement created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, basicDues, leaveEncashment, bonusDue, deductions, loanRecovery, notes, create, resetForm]);

  const handleComplete = useCallback(() => {
    if (!completeId) return;
    complete.mutate(completeId, {
      onSuccess: () => {
        toast.success("Settlement marked as completed");
        setCompleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, complete]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleCompleteIdClose = useCallback((open: boolean) => {
    if (!open) setCompleteId(null);
  }, []);

  const handleBasicDuesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBasicDues(e.target.value), []);
  const handleLeaveEncashmentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLeaveEncashment(e.target.value), []);
  const handleBonusDueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBonusDue(e.target.value), []);
  const handleDeductionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDeductions(e.target.value), []);
  const handleLoanRecoveryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLoanRecovery(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const loadingSkeleton = (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );

  return (
    <PageWrapper
      title="Final settlement"
      subtitle="Manage final settlements for separated employees"
      actions={
        canCreate ? (
          <Button size="sm" onClick={handleOpenSheet} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create settlement
          </Button>
        ) : undefined
      }
    >
      <PageState resolution={pageState} loading={loadingSkeleton} onRetry={handleRetry} className="flex-1">
        {!items?.length ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-24 w-24" />}
            title="No final settlements on record"
            description="Final settlements for separated employees will appear here."
            compact
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {items.map((item: FnfSettlement) => (
              <FnfCard
                key={item.id}
                item={item}
                onMarkPaid={setCompleteId}
                canMarkPaid={canCreate}
                isPending={complete.isPending && complete.variables === item.id}
                money={money}
              />
            ))}
          </div>
        )}
      </PageState>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create final settlement"
        onSubmit={handleCreate}
        submitLabel="Create settlement"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Employee <span className="text-destructive">*</span>
          </label>
          <EmployeePicker
            value={userId}
            onChange={setUserId}
            placeholder="Select employee…"
          />
        </div>

        <div className="space-y-2">
          <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
            Settlement components ({money.currency})
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Basic Dues</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={basicDues}
                onChange={handleBasicDuesChange}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Leave Encashment</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={leaveEncashment}
                onChange={handleLeaveEncashmentChange}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bonus Due</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={bonusDue}
                onChange={handleBonusDueChange}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Deductions</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={deductions}
                onChange={handleDeductionsChange}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Loan Recovery</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={loanRecovery}
                onChange={handleLoanRecoveryChange}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <Textarea
            placeholder="Additional settlement notes…"
            value={notes}
            onChange={handleNotesChange}
            rows={3}
            maxLength={500}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <ConfirmSheet
        open={completeId !== null}
        onOpenChange={handleCompleteIdClose}
        title="Mark Settlement as Paid"
        description="Are you sure you want to mark this final settlement as paid? This confirms that the settled amount has been disbursed to the employee."
        confirmLabel="Mark as Paid"
        onConfirm={handleComplete}
        isPending={complete.isPending}
      />
    </PageWrapper>
  );
}
