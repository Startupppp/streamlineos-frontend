"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

interface PayslipMonth {
  value: string;
  label: string;
}

interface PayslipListProps {
  payslips: Array<{ month: string }>;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function PayslipList({ payslips, selectedMonth, onMonthChange }: PayslipListProps) {
  const availableMonths: PayslipMonth[] = payslips.map((p) => ({
    value: p.month,
    label: format(parseISO(p.month + "-01"), "MMMM yyyy"),
  }));

  if (payslips.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
        title="No payslips available"
        description="Your payslips will appear here once they have been generated."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {availableMonths.map((month) => {
        const isSelected = selectedMonth === month.value;
        const abbr = format(parseISO(month.value + "-01"), "MMM").toUpperCase();
        return (
          <button
            key={month.value}
            type="button"
            aria-label={`Select payslip for ${month.label}`}
            aria-pressed={isSelected}
            onClick={() => onMonthChange(month.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isSelected
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                : "border-border/60 bg-card hover:bg-muted/40 hover:border-blue-300",
            )}
          >
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                isSelected
                  ? "bg-blue-500"
                  : "bg-blue-100 dark:bg-blue-950/40",
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-bold",
                  isSelected ? "text-white" : "text-blue-700 dark:text-blue-400",
                )}
              >
                {abbr}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                isSelected ? "text-blue-700 dark:text-blue-400" : "text-foreground",
              )}
            >
              {month.label}
            </span>
            {isSelected && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
