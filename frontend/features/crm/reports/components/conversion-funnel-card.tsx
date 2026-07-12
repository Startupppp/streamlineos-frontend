"use client";

import { useReducedMotion, motion } from "framer-motion";
import { TrendingUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStats } from "@/types/leads";
import type { CrmOption } from "@/types/crm/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import { PIPELINE_COLORS, FUNNEL_STAGES } from "../lib/types";

interface ConversionFunnelCardProps {
  stats: LeadStats;
  statusOptions?: CrmOption[];
}

export function ConversionFunnelCard({ stats, statusOptions }: ConversionFunnelCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const stages = statusOptions && statusOptions.length > 0
    ? statusOptions
        .filter((o) => o.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((opt) => {
          const cls = getCrmTokenClasses(opt.color);
          return {
            key: opt.key,
            label: opt.label,
            bgLight: `${cls.badgeClass.split(" ")[0]}`,
            borderLeft: `border-l-2`,
            borderColor: cls.chartHex,
            text: cls.textClass,
          };
        })
    : FUNNEL_STAGES.map((status) => {
        const config = PIPELINE_COLORS[status] ?? PIPELINE_COLORS["NEW"];
        return {
          key: status,
          label: status.charAt(0) + status.slice(1).toLowerCase(),
          bgLight: config.bgLight,
          borderLeft: config.borderLeft,
          borderColor: undefined,
          text: config.text,
        };
      });

  const maxCount = stages.length > 0
    ? Math.max(1, ...(stages.map((s) => stats.byStatus[s.key] ?? 0)))
    : 1;

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5 py-2">
          {stages.map((stage, i, arr) => {
            const count = stats.byStatus[stage.key] ?? 0;
            const widthPct = Math.max(18, (count / maxCount) * 100);
            const prevStage = arr[i - 1];
            const prevCount =
              i === 0 || !prevStage
                ? stats.total
                : (stats.byStatus[prevStage.key] ?? count);
            const convPct =
              prevCount > 0
                ? ((count / prevCount) * 100).toFixed(0)
                : "0";

            return (
              <motion.div
                key={stage.key}
                className="flex flex-col items-center w-full"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
              >
                <div
                  className={cn(
                    "h-11 rounded-lg flex items-center justify-between px-4 gap-3 w-full max-w-full transition-all border-l-[3px]",
                    stage.bgLight,
                    stage.borderLeft,
                  )}
                  style={{
                    maxWidth: `${widthPct}%`,
                    borderLeftColor: stage.borderColor,
                  }}
                >
                  <span className={cn("text-sm font-semibold capitalize whitespace-nowrap", stage.text)}>
                    {stage.label}
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
