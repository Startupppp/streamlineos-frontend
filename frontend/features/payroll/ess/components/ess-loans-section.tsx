"use client";

import { memo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssLoans, useCreateLoan } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { EssLoan } from "@/types/payroll/ess";
import { cn } from "@/lib/utils";

const LOAN_AMOUNT_MIN = 1000;
const LOAN_AMOUNT_MAX = 10_000_000;
const LOAN_EMIS_MAX = 360;

const loanSchema = z.object({
  amount: z.string().min(1, "Amount required").refine((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= LOAN_AMOUNT_MIN && n <= LOAN_AMOUNT_MAX;
  }, `Between ₹${LOAN_AMOUNT_MIN.toLocaleString("en-IN")} and ₹${LOAN_AMOUNT_MAX.toLocaleString("en-IN")}`),
  reason: z.string().min(1, "Reason required").max(500),
  totalEmis: z.string().min(1, "EMI count required").refine((v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 && n <= LOAN_EMIS_MAX;
  }, `Between 1 and ${LOAN_EMIS_MAX} EMIs`),
});

type LoanFormValues = z.infer<typeof loanSchema>;

const LoanCard = memo(function LoanCard({ loan }: { loan: EssLoan }) {
  const total = loan.totalEmis ?? 0;
  const paidPct = total > 0 ? Math.round((loan.paidEmis / total) * 100) : 0;

  return (
    <div className="p-4 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{loan.reason || "Loan/Advance"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loan.paidEmis}/{total ?? "—"} EMIs paid · ₹{formatMoney(loan.emiAmount)}/mo
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(loan.balance)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">balance</p>
        </div>
      </div>
      <div className="space-y-1">
        <Progress value={paidPct} className="h-1.5" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{paidPct}% repaid</span>
          <EssStatusBadge status={loan.status} />
        </div>
      </div>
    </div>
  );
});

function LoanSkeleton() {
  return (
    <div className="p-4 border-b border-border last:border-0 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

interface LoanDialogProps {
  open: boolean;
  onClose: () => void;
}

function RequestLoanDialog({ open, onClose }: LoanDialogProps) {
  const mutation = useCreateLoan();
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: { amount: "", reason: "", totalEmis: "" },
  });

  const handleSubmit = async (values: LoanFormValues) => {
    try {
      await mutation.mutateAsync({
        amount: parseFloat(values.amount),
        reason: values.reason,
        totalEmis: parseInt(values.totalEmis, 10),
      });
      toast.success("Loan request submitted");
      form.reset();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Loan / Advance</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalEmis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repayment months <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="60" placeholder="e.g. 12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Brief reason for this request" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <LoadingButton type="submit" isPending={mutation.isPending} loadingText="Submitting…">
                Submit Request
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EssLoansSectionProps {
  allowRequests: boolean;
  hideToolbar?: boolean;
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export function EssLoansSection({
  allowRequests,
  hideToolbar = false,
  dialogOpen: dialogOpenProp,
  onDialogOpenChange,
}: EssLoansSectionProps) {
  const { data: loans, isLoading } = useEssLoans();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const dialogOpen = dialogOpenProp ?? uncontrolledOpen;
  const setDialogOpen = onDialogOpenChange ?? setUncontrolledOpen;

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);

  const activeLoans = loans?.filter((l) => l.status === "ACTIVE" || l.status === "APPROVED") ?? [];
  const pastLoans = loans?.filter((l) => l.status !== "ACTIVE" && l.status !== "APPROVED") ?? [];

  return (
    <section id="loans" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {allowRequests && !hideToolbar ? (
        <div className="flex shrink-0 items-center justify-end gap-3">
          <AnimatedIconButton
            icon={PlusIcon}
            iconClassName="mr-1.5"
            size="sm"
            className="h-8 text-xs"
            onClick={handleOpenDialog}
          >
            Request Loan
          </AnimatedIconButton>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {isLoading ? (
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 2 }).map((_, i) => (
              <LoanSkeleton key={i} />
            ))}
          </div>
        ) : !loans || loans.length === 0 ? (
          <EmptyState
            illustrationPreset="payroll"
            title="No loans or advances"
            description={allowRequests ? "Request a salary advance or loan and track repayment here." : "No active loans."}
            action={allowRequests ? { label: "Request Loan", onClick: handleOpenDialog } : undefined}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {activeLoans.length > 0 && (
              <div>
                <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</p>
                {activeLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            )}
            {pastLoans.length > 0 && (
              <div className={cn(activeLoans.length > 0 && "border-t border-border")}>
                <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                {pastLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      <RequestLoanDialog open={dialogOpen} onClose={handleCloseDialog} />
    </section>
  );
}
