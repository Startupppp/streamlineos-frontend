"use client";

import { useReducedMotion, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadStats } from "@/types/leads";
import type { CrmOption } from "@/types/crm/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";

interface PipelineBreakdownCardProps {
  stats: LeadStats;
  maxPipelineCount: number;
  statusOptions?: CrmOption[];
}

export function PipelineBreakdownCard({
  stats,
  maxPipelineCount,
  statusOptions,
}: PipelineBreakdownCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Pipeline Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const option = statusOptions?.find((o) => o.key === status);
            const dotClass = getCrmTokenClasses(option?.color ?? "slate").dotClass;

            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotClass)} />
                    <span className="text-sm font-medium capitalize">
                      {option?.label ?? status.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums">
                      {count}
                    </span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="h-2.5 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={maxPipelineCount}
                  aria-label={`${status} pipeline count`}
                >
                  <motion.div
                    className={cn("h-full w-full rounded-full origin-left", dotClass)}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: maxPipelineCount > 0 ? count / maxPipelineCount : 0 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { duration: 0.3, delay: 0.15, ease: "easeOut" }
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
