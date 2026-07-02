"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Period = "week" | "month" | "quarter" | "year";

interface PeriodOption {
  label: string;
  value: Period;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
];

export function periodToDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0] ?? "";

  if (period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { from: from.toISOString().split("T")[0] ?? "", to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().split("T")[0] ?? "", to };
  }
  if (period === "quarter") {
    const from = new Date(now);
    from.setMonth(now.getMonth() - 3);
    return { from: from.toISOString().split("T")[0] ?? "", to };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: from.toISOString().split("T")[0] ?? "", to };
}

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const p = e.currentTarget.dataset.period as Period | undefined;
      if (p) onPeriodChange(p);
    },
    [onPeriodChange],
  );

  return (
    <div className="flex items-center gap-1.5">
      {PERIOD_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          data-period={opt.value}
          variant={period === opt.value ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 text-xs px-3",
            period === opt.value &&
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-md hover:from-violet-700 hover:to-indigo-700",
          )}
          onClick={handleClick}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
