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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Recent Payslips</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
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
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/30 transition-colors text-left",
                    "hover:bg-muted/60 hover:border-blue-400",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  )}
                  onClick={() => onSelect(payslip.month)}
                  aria-label={`View payslip for ${monthLabel}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{monthLabel}</p>
                      {payslip.status && (
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {payslip.status.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                      ₹{netSalary.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Net</p>
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
