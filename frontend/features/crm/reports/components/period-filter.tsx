"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type Period } from "../lib/types";

interface PeriodFilterProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  const handleButtonClick = useCallback(
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
          onClick={handleButtonClick}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
