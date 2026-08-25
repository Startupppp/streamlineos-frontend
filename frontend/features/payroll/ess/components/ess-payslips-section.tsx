"use client";

import { memo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPayroll } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEssPayslips } from "@/hooks/api/payroll/ess";
import { useExplainPayslip } from "@/hooks/api/payroll/use-explain-payslip";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { apiClient } from "@/lib/api-client";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { numberToWords } from "@/lib/format-utils";
import type { EssPayslip } from "@/types/payroll/ess";

function getYear(month: string): string {
  return month.split("-")[0] ?? "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PayslipRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

interface DownloadButtonProps {
  payslip: EssPayslip;
}

const DownloadButton = memo(function DownloadButton({ payslip }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await apiClient.download(payslip.downloadHref);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip_${formatMonth(payslip.month).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Payslip downloaded");
    } catch {
      toast.error("Failed to download payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedIconButton
      icon={DownloadIcon}
      iconClassName="mr-1.5"
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? "Downloading…" : "Download"}
    </AnimatedIconButton>
  );
});

interface ExplainMenuProps {
  payslip: EssPayslip;
}

const ExplainMenu = memo(function ExplainMenu({ payslip }: ExplainMenuProps) {
  const { mutateAsync } = useExplainPayslip(payslip.publicationId);

  const actions: AiAction[] = [
    {
      key: "explain-payslip",
      label: "Explain this payslip",
      description:
        "Plain-language breakdown of engine figures only — AI never changes pay",
      run: async () => {
        const result = await mutateAsync();
        const citations = (result.citations ?? []).slice(0, 12).map((c, i) => ({
          id: c.path || i,
          title: c.label,
          snippet:
            c.value != null
              ? `${c.path}: ${typeof c.value === "string" ? c.value : String(c.value)}`
              : c.path,
        }));
        return { text: result.explanation, citations, aiUsage: result.aiUsage };
      },
    },
  ];

  return <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="Payslip AI" align="end" />;
});

interface EssPayslipsSectionProps {
  yearFilter?: string;
  onYearFilterChange?: (value: string) => void;
  hideYearFilter?: boolean;
}

export function EssPayslipsSection({
  yearFilter: yearFilterProp,
  onYearFilterChange,
  hideYearFilter = false,
}: EssPayslipsSectionProps) {
  const { data: payslips, isLoading, isError, error, refetch } = useEssPayslips();
  const [uncontrolledYear, setUncontrolledYear] = useState("all");
  const yearFilter = yearFilterProp ?? uncontrolledYear;
  const setYearFilter = onYearFilterChange ?? setUncontrolledYear;
  const shouldReduceMotion = useReducedMotion();

  const years = payslips
    ? [...new Set(payslips.map((p) => getYear(p.month)))].filter(Boolean).sort((a, b) => Number(b) - Number(a))
    : [];

  const filtered = payslips
    ? yearFilter === "all" ? payslips : payslips.filter((p) => getYear(p.month) === yearFilter)
    : [];

  return (
    <section id="payslips" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {!hideYearFilter && years.length > 0 ? (
        <div className="flex shrink-0 items-center justify-end gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-28`}>
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 10 }).map((_, i) => (
              <PayslipRowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            description={getErrorMessage(error)}
            onRetry={refetch}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={<EmptyPayroll />}
            title="No payslips yet"
            description="They appear here once payroll publishes for the month."
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-y-auto rounded-xl border border-border bg-card">
            {filtered.map((payslip, idx) => (
              <motion.div
                key={payslip.publicationId}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.04, ease: "easeOut" }}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-500/10">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {formatMonth(payslip.month)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Published {formatDate(payslip.publishedAt)}
                    </p>
                    {payslip.workerType === "CONTRACTOR" && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {payslip.invoiceNumber && (
                          <span className="text-micro text-muted-foreground">
                            Invoice #{payslip.invoiceNumber}
                          </span>
                        )}
                        {payslip.paymentAdvice && (
                          <span className="text-micro text-muted-foreground">
                            Advice: {payslip.paymentAdvice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="hidden flex-col items-end sm:flex">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatMoney(payslip.net)}
                    </span>
                    {payslip.net && (
                      <span className="text-micro text-muted-foreground">
                        {numberToWords(Math.round(parseFloat(payslip.net)))} only
                      </span>
                    )}
                  </div>
                  <ExplainMenu payslip={payslip} />
                  <DownloadButton payslip={payslip} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
