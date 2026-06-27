"use client";

import { FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecentPayslip {
  id: number;
  month: string;
  status?: string | null;
  netSalary?: string | null;
}

interface RecentPayslipsListProps {
  payslips: RecentPayslip[];
  onSelect: (month: string) => void;
  limit?: number;
}

export function RecentPayslipsList({
  payslips,
  onSelect,
  limit = 6,
}: RecentPayslipsListProps) {
  if (!payslips.length) return null;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-sm font-semibold text-foreground">Recent Payslips</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <ul className="space-y-1.5">
          {payslips.slice(0, limit).map((payslip) => {
            const monthLabel = format(
              parseISO(payslip.month + "-01"),
              "MMMM yyyy",
            );
            const netSalary = parseFloat(payslip.netSalary || "0");

            return (
              <li key={payslip.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 transition-colors duration-200 text-left",
                    "hover:bg-muted/50 hover:border-blue-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  )}
                  onClick={() => onSelect(payslip.month)}
                  aria-label={`View payslip for ${monthLabel}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{monthLabel}</p>
                      {payslip.status && (
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-0.5",
                            payslip.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"
                              : payslip.status === "APPROVED"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800"
                                : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800",
                          )}
                        >
                          {payslip.status.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                      ₹{netSalary.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
