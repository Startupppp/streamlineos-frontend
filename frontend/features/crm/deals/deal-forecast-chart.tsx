"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useMotionVariants } from "@/lib/motion-variants";
import type { Deal, DealStage } from "@/types/crm";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { useOrgDisplay } from "@/hooks/api/org-display";

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

const STAGE_DOT: Partial<Record<DealStage, string>> = {
  LEAD: "bg-status-info-fill",
  CONTACTED: "bg-status-info-fill",
  PROPOSAL: "bg-status-warning-fill",
  NEGOTIATION: "bg-status-info-fill",
  WON: "bg-status-success-fill",
};

const STAGE_LABEL: Partial<Record<DealStage, string>> = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
};

const STAGE_ORDER: DealStage[] = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON"];

interface StageRow {
  stage: DealStage;
  count: number;
  totalValue: number;
  weightedValue: number;
  probability: number;
}

interface DealForecastChartProps {
  deals: Deal[];
}

export function DealForecastChart({ deals }: DealForecastChartProps) {
  const money = useOrgDisplay();
  const shouldReduceMotion = useReducedMotion();
  const { staggerContainer, fadeUp } = useMotionVariants();

  const { rows, maxWeighted } = useMemo(() => {
    const map = new Map<DealStage, StageRow>();

    for (const stage of STAGE_ORDER) {
      map.set(stage, { stage, count: 0, totalValue: 0, weightedValue: 0, probability: STAGE_PROBABILITY[stage] ?? 0 });
    }

    for (const d of deals) {
      if (d.stage === "LOST") continue;
      const row = map.get(d.stage as DealStage);
      if (!row) continue;
      const value = Number(d.value ?? 0);
      const prob =
        d.probability != null && d.probability > 0
          ? d.probability
          : (STAGE_PROBABILITY[d.stage] ?? 0);
      row.count += 1;
      row.totalValue += value;
      row.weightedValue += value * (prob / 100);
    }

    const stageRows = STAGE_ORDER
      .map((s) => map.get(s))
      .filter((r): r is StageRow => r !== undefined && r.count > 0);
    const max = Math.max(...stageRows.map((r) => r.weightedValue), 1);

    return { rows: stageRows, maxWeighted: max };
  }, [deals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
        <p className="text-xs text-muted-foreground">Weighted value per stage</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <ChartEmptyState message="No active deals." height={160} compact />
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {rows.map((row, idx) => (
              <motion.div
                key={row.stage}
                variants={fadeUp}
                transition={{ delay: idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STAGE_DOT[row.stage] ?? "bg-muted-foreground"}`} />
                    <TruncatedText text={STAGE_LABEL[row.stage] ?? row.stage} className="text-sm font-medium" />
                    <Badge variant="outline" className="text-micro h-4 px-1.5 shrink-0">
                      {row.probability}%
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {row.count} deal{row.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMoneyCompact(row.weightedValue, money)}
                    </p>
                    <p className="text-micro text-muted-foreground tabular-nums">
                      of {formatMoneyCompact(row.totalValue, money)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full w-full rounded-full bg-primary origin-left"
                    style={{
                      transform: `scaleX(${row.weightedValue / maxWeighted})`,
                      transition: shouldReduceMotion
                        ? "none"
                        : `transform 0.35s ease-out ${idx * 0.08 + 0.15}s`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
