"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  className?: string;
}

const changeStyles = {
  up: { color: "text-emerald-600 dark:text-emerald-400", Icon: ArrowUp },
  down: { color: "text-red-600 dark:text-red-400", Icon: ArrowDown },
  neutral: { color: "text-muted-foreground", Icon: Minus },
} as const;

export function MetricCard({
  label,
  value,
  change,
  icon: IconProp,
  isLoading,
  className,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {IconProp && <IconProp className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {change && (
        <div className="mt-1 flex items-center gap-1">
          {(() => {
            const { color, Icon } = changeStyles[change.direction];
            return (
              <>
                <Icon className={cn("h-3 w-3", color)} />
                <span className={cn("text-xs font-medium", color)}>
                  {change.value > 0 ? "+" : ""}
                  {change.value}%
                </span>
              </>
            );
          })()}
          {change.label && (
            <span className="text-xs text-muted-foreground">{change.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
