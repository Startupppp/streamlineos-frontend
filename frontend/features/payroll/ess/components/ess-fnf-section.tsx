"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssFnf } from "@/hooks/api/payroll/ess";
import { downloadFnfStatement } from "@/hooks/api/payroll/fnf";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

const FnfRow = memo(function FnfRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value || parseFloat(value) === 0) return null;
  return (
    <div className={`flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-0 ${highlight ? "bg-muted/40" : ""}`}>
      <span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${highlight ? "text-base font-bold text-status-success-ink" : "font-medium text-foreground"}`}>
        {formatMoney(value)}
      </span>
    </div>
  );
});

export function EssFnfSection({ hideToolbar = false }: { hideToolbar?: boolean }) {
  const { data: settlement, isLoading } = useEssFnf();
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadStatement() {
    if (!settlement || downloading) return;
    setDownloading(true);
    try {
      await downloadFnfStatement(settlement.id);
      toast.success("Statement downloaded");
    } catch {
      toast.error("Failed to download statement");
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <section id="fnf" className="flex min-h-0 w-full flex-1 flex-col">
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!settlement) return null;

  return (
    <section id="fnf" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {!hideToolbar ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          <EssStatusBadge status={settlement.status} />
          {settlement.statementPublishedAt ? (
            <AnimatedIconButton
              icon={DownloadIcon}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDownloadStatement}
              disabled={downloading}
            >
              {downloading ? "Downloading…" : "Download statement"}
            </AnimatedIconButton>
          ) : null}
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-card"
      >
        {hideToolbar ? (
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <EssStatusBadge status={settlement.status} />
          </div>
        ) : null}

        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
        </div>
        <FnfRow label="Pending Salary" value={settlement.basicDues} />
        <FnfRow label="Leave Encashment" value={settlement.leaveEncashment} />
        <FnfRow label="Bonus Due" value={settlement.bonusDue} />
        <FnfRow label="Reimbursements" value={settlement.reimbursementsDue} />

        <div className="border-y border-border bg-muted/30 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
        </div>
        <FnfRow label="Loan Recovery" value={settlement.loanRecovery} />
        <FnfRow label="Asset Recovery" value={settlement.assetRecovery} />
        <FnfRow label="Notice Period Recovery" value={settlement.noticeRecovery} />
        <FnfRow label="Other Deductions" value={settlement.otherDeductions} />
        <FnfRow label="Miscellaneous Deductions" value={settlement.deductions} />

        <div className="border-t-2 border-border">
          <FnfRow label="Net Payable" value={settlement.netPayable} highlight />
        </div>

        {settlement.notes ? (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{settlement.notes}</p>
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
