"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINRCompact } from "@/lib/format-utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import type { Deal, DealStage } from "@/types/crm";

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

const STAGE_DOT: Partial<Record<DealStage, string>> = {
  LEAD: "bg-blue-500",
  CONTACTED: "bg-sky-500",
  PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-violet-500",
  WON: "bg-emerald-500",
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
  const shouldReduceMotion = useReducedMotion();

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

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
        <p className="text-xs text-muted-foreground">Weighted value per stage</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No active deals.</p>
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
                variants={itemVariants}
                transition={{ delay: idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STAGE_DOT[row.stage] ?? "bg-slate-400"}`} />
                    <span className="text-sm font-medium truncate">
                      {STAGE_LABEL[row.stage] ?? row.stage}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                      {row.probability}%
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {row.count} deal{row.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatINRCompact(row.weightedValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      of {formatINRCompact(row.totalValue)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full w-full rounded-full bg-blue-600 origin-left"
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
