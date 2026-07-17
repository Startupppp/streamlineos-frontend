"use client";

import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useEssSalaryStructure } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function SalaryStructureSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EssSalarySection() {
  const { data, isLoading, isError } = useEssSalaryStructure();

  if (isLoading) {
    return (
      <section id="salary" className="scroll-mt-20">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          Salary Structure
        </h2>
        <SalaryStructureSkeleton />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section id="salary" className="scroll-mt-20">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          Salary Structure
        </h2>
        <EmptyState
          title="Not available"
          description="Your salary structure is not visible yet or has not been configured."
          compact
        />
      </section>
    );
  }

  const earnings = data.components.filter((c) => c.type === "EARNING");
  const deductions = data.components.filter((c) => c.type === "DEDUCTION" || c.type === "EMPLOYER_CONTRIBUTION");

  return (
    <section id="salary" className="scroll-mt-20">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <IndianRupee className="h-4 w-4 text-muted-foreground" />
        Salary Structure
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Annual CTC</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{formatMoney(data.profile.annualCtc)}</p>
          </div>
          {data.profile.effectiveFrom && (
            <p className="text-xs text-muted-foreground">Effective from {formatDate(data.profile.effectiveFrom)}</p>
          )}
        </div>

        {earnings.length > 0 && (
          <div>
            <div className="px-4 py-2 flex items-center gap-1.5 border-b border-border">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Earnings</span>
            </div>
            {earnings.map((c, idx) => (
              <div
                key={c.code}
                className={cn("flex items-center justify-between gap-2 px-4 py-2.5 text-sm min-w-0", idx < earnings.length - 1 && "border-b border-border")}
              >
                <TruncatedText text={c.name} className="min-w-0 flex-1 text-foreground" />
                <span className="tabular-nums font-medium text-foreground shrink-0">{formatMoney(c.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {deductions.length > 0 && (
          <div className="border-t border-border">
            <div className="px-4 py-2 flex items-center gap-1.5 border-b border-border">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Deductions</span>
            </div>
            {deductions.map((c, idx) => (
              <div
                key={c.code}
                className={cn("flex items-center justify-between gap-2 px-4 py-2.5 text-sm min-w-0", idx < deductions.length - 1 && "border-b border-border")}
              >
                <TruncatedText text={c.name} className="min-w-0 flex-1 text-foreground" />
                <span className="tabular-nums font-medium text-red-600 shrink-0">– {formatMoney(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
