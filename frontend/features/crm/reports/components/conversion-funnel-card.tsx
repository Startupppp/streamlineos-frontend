"use client";

import { useReducedMotion, motion } from "framer-motion";
import { TrendingUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStats } from "@/types/leads";
import { PIPELINE_COLORS, FUNNEL_STAGES } from "../lib/types";

interface ConversionFunnelCardProps {
  stats: LeadStats;
}

export function ConversionFunnelCard({ stats }: ConversionFunnelCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5 py-2">
          {FUNNEL_STAGES.map((status, i, arr) => {
            const count = stats.byStatus[status] ?? 0;
            const maxCount = stats.byStatus.NEW || 1;
            const widthPct = Math.max(18, (count / maxCount) * 100);
            const config = PIPELINE_COLORS[status] ?? PIPELINE_COLORS["NEW"]!;
            const prevCount =
              i === 0
                ? stats.total
                : (stats.byStatus[arr[i - 1]!] ?? count);
            const convPct =
              prevCount > 0
                ? ((count / prevCount) * 100).toFixed(0)
                : "0";

            return (
              <motion.div
                key={status}
                className="flex flex-col items-center w-full"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
              >
                <div
                  className={cn(
                    "h-11 rounded-lg flex items-center justify-between px-4 gap-3 w-full max-w-full transition-all border-l-[3px]",
                    config.bgLight,
                    config.borderLeft,
                  )}
                  style={{ maxWidth: `${widthPct}%` }}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold capitalize whitespace-nowrap",
                      config.text,
                    )}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                    {i > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {convPct}% conv.
                      </span>
                    )}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/30 my-0.5" />
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
