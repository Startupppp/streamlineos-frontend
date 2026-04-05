"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "../_constants";

interface CrmPipelineMiniProps {
  byStatus: Record<string, number>;
  total: number;
}

export function CrmPipelineMini({ byStatus, total }: CrmPipelineMiniProps) {
  const maxCount = Math.max(1, ...Object.values(byStatus));

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PIPELINE_STAGES.filter(s => s.key !== "LOST").map((stage, i) => {
          const count = byStatus[stage.key] ?? 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.dot)} />
                  <span className="font-medium">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{count}</span>
                  <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: stage.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
