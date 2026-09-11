"use client";

import { motion, useReducedMotion } from "framer-motion";
import { NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
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
  const stages = statusOptions.filter((o) => o.key !== "LOST");
  const maxCount = Math.max(1, ...Object.values(byStatus));
  const isEmpty = total === 0 || stages.length === 0;

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:leads:view") === "denied")
    return <NoPermissionState permission="crm:leads:view" />;

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {isEmpty ? (
          <EmptyState
            illustration={<EmptyChartIllustration className="h-20 w-20" />}
            title="No pipeline data"
            description="Add leads to see your conversion funnel."
            compact
          />
        ) : (
          stages.map((option, i) => {
            const count = byStatus[option.key] ?? 0;
            const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
            const scaleTarget = count / maxCount;
            const dotClass = getCrmTokenClasses(option.color ?? "").dotClass;
            return (
              <div key={option.key} className="space-y-0.5">
                <div className="flex items-center justify-between text-micro">
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
          })
        )}
      </CardContent>
    </Card>
  );
}
