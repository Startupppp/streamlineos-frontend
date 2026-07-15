"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type KeyResult } from "@/hooks/api/goals";
import { keyResultPercent, formatMetricValue } from "./constants";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

interface KeyResultRowProps {
  keyResult: KeyResult;
  onCheckIn: (keyResult: KeyResult) => void;
}

export function KeyResultRow({ keyResult, onCheckIn }: KeyResultRowProps) {
  const percent = keyResultPercent(keyResult);

  function handleCheckIn() {
    onCheckIn(keyResult);
  }

  return (
    <div className={cn(PM_PANEL, "space-y-2 p-3")}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className={cn(TEXT_ONE_LINE, "text-sm font-medium")} title={keyResult.title}>
          {keyResult.title}
        </p>
        <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={handleCheckIn}>
          Check in
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatMetricValue(keyResult.currentValue, keyResult.metricType, keyResult.unit)}
            {" / "}
            {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} className="h-1.5" />
      </div>
    </div>
  );
}
