"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPayroll } from "@/components/illustrations/empty-payroll";
import { useEssPayslips } from "@/hooks/api/payroll/ess";
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
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}

interface DownloadButtonProps {
  payslip: EssPayslip;
}

function DownloadButton({ payslip }: DownloadButtonProps) {
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
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5"
      onClick={handleDownload}
      disabled={loading}
    >
      <Download className="h-3 w-3" />
      {loading ? "Downloading…" : "Download"}
    </Button>
  );
}

export function EssPayslipsSection() {
  const { data: payslips, isLoading } = useEssPayslips();
  const [yearFilter, setYearFilter] = useState<string>("all");
  const shouldReduceMotion = useReducedMotion();

  const years = payslips
    ? [...new Set(payslips.map((p) => getYear(p.month)))].filter(Boolean).sort((a, b) => Number(b) - Number(a))
    : [];

  const filtered = payslips
    ? yearFilter === "all" ? payslips : payslips.filter((p) => getYear(p.month) === yearFilter)
    : [];

  return (
    <section id="payslips" className="scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Payslips
        </h2>
        {years.length > 0 && (
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => <PayslipRowSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={<EmptyPayroll />}
            title="No payslips yet"
            description="They appear here once payroll publishes for the month."
          />
        ) : (
          <div>
            {filtered.map((payslip, idx) => (
              <motion.div
                key={payslip.publicationId}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.04, ease: "easeOut" }}
                className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-none">{formatMonth(payslip.month)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Published {formatDate(payslip.publishedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatMoney(payslip.net)}
                    </span>
                    {payslip.net && (
                      <span className="text-[10px] text-muted-foreground">
                        {numberToWords(Math.round(parseFloat(payslip.net)))} only
                      </span>
                    )}
                  </div>
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
