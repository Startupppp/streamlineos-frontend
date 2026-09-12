"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Paperclip } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { useEssReimbursements } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { EssStatusBadge } from "./ess-status-badge";
import { SubmitSheet } from "./ess-reimbursements-submit-sheet";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return formatShortDate(iso);
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function EssReimbursementsSection({
  hideToolbar = false,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: {
  hideToolbar?: boolean;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const { data: reimbursements, isLoading, isError, error, refetch } = useEssReimbursements();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const sheetOpen = sheetOpenProp ?? uncontrolledOpen;
  const setSheetOpen = onSheetOpenChange ?? setUncontrolledOpen;

  const handleOpenSheet = () => setSheetOpen(true);
  const handleCloseSheet = () => setSheetOpen(false);

  return (
    <section id="reimbursements" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {!hideToolbar ? (
        <div className="flex shrink-0 items-center justify-end gap-3">
          <AnimatedIconButton
            icon={PlusIcon}
            iconClassName="mr-1.5"
            size="sm"
            className="h-8 text-xs"
            onClick={handleOpenSheet}
          >
            Submit Claim
          </AnimatedIconButton>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 8 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            description={getErrorMessage(error)}
            onRetry={refetch}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : !reimbursements || reimbursements.length === 0 ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No claims yet"
            description="Submit a reimbursement claim and track its approval status here."
            action={{ label: "Submit Claim", onClick: handleOpenSheet }}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-y-auto rounded-xl border border-border bg-card">
            {reimbursements.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: idx * 0.04, ease: "easeOut" }}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex w-8 shrink-0 items-center justify-center rounded-md bg-status-success-surface">
                    <Receipt className="h-4 w-4 text-status-success-ink" />
                  </div>
                  <div className="min-w-0">
                    <TruncatedText text={r.category} className="text-sm font-medium text-foreground" />
                    <TruncatedText text={r.description || formatDate(r.createdAt)} className="mt-0.5 text-xs text-muted-foreground" />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <EssStatusBadge status={r.status} />
                  <span className="hidden text-sm font-semibold tabular-nums text-foreground sm:block">
                    {formatMoney(r.amount)}
                  </span>
                  {r.receiptUrl && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SubmitSheet open={sheetOpen} onClose={handleCloseSheet} />
    </section>
  );
}
