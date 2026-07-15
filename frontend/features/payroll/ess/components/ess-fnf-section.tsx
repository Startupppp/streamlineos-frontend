"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { FileCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssFnf } from "@/hooks/api/payroll/ess";
import { downloadFnfStatement } from "@/hooks/api/payroll/fnf";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

const FnfRow = memo(function FnfRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value || parseFloat(value) === 0) return null;
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm border-b border-border last:border-0 ${highlight ? "bg-muted/40" : ""}`}>
      <span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${highlight ? "font-bold text-emerald-700 text-base" : "font-medium text-foreground"}`}>
        {formatMoney(value)}
      </span>
    </div>
  );
});

export function EssFnfSection() {
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
      <section id="fnf" className="scroll-mt-20">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <FileCheck className="h-4 w-4 text-muted-foreground" />
          Full & Final Settlement
        </h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
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
    <section id="fnf" className="scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-muted-foreground" />
          Full & Final Settlement
        </h2>
        <div className="flex items-center gap-2">
          <EssStatusBadge status={settlement.status} />
          {settlement.statementPublishedAt && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleDownloadStatement}
              disabled={downloading}
            >
              <Download className="h-3 w-3" />
              {downloading ? "Downloading…" : "Download statement"}
            </Button>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earnings</p>
        </div>
        <FnfRow label="Pending Salary" value={settlement.basicDues} />
        <FnfRow label="Leave Encashment" value={settlement.leaveEncashment} />
        <FnfRow label="Bonus Due" value={settlement.bonusDue} />
        <FnfRow label="Reimbursements" value={settlement.reimbursementsDue} />

        <div className="px-4 py-2.5 bg-muted/30 border-y border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deductions</p>
        </div>
        <FnfRow label="Loan Recovery" value={settlement.loanRecovery} />
        <FnfRow label="Asset Recovery" value={settlement.assetRecovery} />
        <FnfRow label="Notice Period Recovery" value={settlement.noticeRecovery} />
        <FnfRow label="Other Deductions" value={settlement.otherDeductions} />
        <FnfRow label="Miscellaneous Deductions" value={settlement.deductions} />

        <div className="border-t-2 border-border">
          <FnfRow label="Net Payable" value={settlement.netPayable} highlight />
        </div>

        {settlement.notes && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{settlement.notes}</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
