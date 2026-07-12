"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";

interface CrmPipelineMiniProps {
  byStatus: Record<string, number>;
  total: number;
}

export function CrmPipelineMini({ byStatus, total }: CrmPipelineMiniProps) {
  const prefersReducedMotion = useReducedMotion();
  const { data: statusOptions = [] } = useCrmOptions("lead_status");
  const maxCount = Math.max(1, ...Object.values(byStatus));

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {statusOptions.filter((o) => o.key !== "LOST").map((option, i) => {
          const count = byStatus[option.key] ?? 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
          const scaleTarget = count / maxCount;
          const dotClass = getCrmTokenClasses(option.color).dotClass;
          return (
            <div key={option.key} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
                  <span className="font-medium">{option.label}</span>
                </div>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="font-bold">{count}</span>
                  <span className="text-muted-foreground w-6 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                {prefersReducedMotion ? (
                  <div
                    className={cn("h-full rounded-full", dotClass)}
                    style={{ width: `${scaleTarget * 100}%` }}
                  />
                ) : (
                  <motion.div
                    className={cn("h-full rounded-full w-full", dotClass)}
                    style={{ transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: scaleTarget }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
