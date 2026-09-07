"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PERIOD_OPTIONS, type Period } from "../lib/types";

interface PeriodFilterProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  const handleButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const p = PERIOD_OPTIONS.find((opt) => opt.value === e.currentTarget.dataset.period);
      if (p) onPeriodChange(p.value);
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
          className="text-xs px-3"
          onClick={handleButtonClick}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
