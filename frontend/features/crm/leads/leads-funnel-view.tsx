"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import type { BoardLead } from "@/features/crm/leads/leads-types";

type LeadBoard = Record<string, BoardLead[]>;

const STAGE_ORDER = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED"] as const;
type Stage = (typeof STAGE_ORDER)[number];

const STAGE_LABELS: Record<Stage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
};

const STAGE_COLORS: Record<Stage, string> = {
  NEW: "from-slate-400 to-slate-500",
  CONTACTED: "from-blue-400 to-blue-500",
  INTERESTED: "from-blue-400 to-blue-500",
  QUALIFIED: "from-amber-400 to-amber-500",
  CONVERTED: "from-emerald-400 to-emerald-500",
};

const STAGE_BG: Record<Stage, string> = {
  NEW: "bg-card border-border",
  CONTACTED: "bg-blue-500/10 border-blue-500/20",
  INTERESTED: "bg-blue-500/10 border-blue-500/20",
  QUALIFIED: "bg-amber-500/10 border-amber-500/20",
  CONVERTED: "bg-emerald-500/10 border-emerald-500/20",
};

interface LeadsFunnelViewProps {
  board: LeadBoard | null;
}

export function LeadsFunnelView({ board }: LeadsFunnelViewProps) {
  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <ChartEmptyState
          message="Add leads to the pipeline to see the conversion funnel"
          height={220}
        />
      </div>
    );
  }

  const maxCount = Math.max(...STAGE_ORDER.map((s) => board[s]?.length ?? 0), 1);

  const stages = STAGE_ORDER.map((stage, idx) => {
    const count = board[stage]?.length ?? 0;
    const prevStage = idx > 0 ? STAGE_ORDER[idx - 1] : null;
    const prevCount = prevStage !== null ? (board[prevStage]?.length ?? 0) : null;
    const conversionRate =
      prevCount !== null && prevCount > 0
        ? Math.round((count / prevCount) * 100)
        : null;
    return { stage, count, conversionRate };
  });

  const totalRevenue = (board["CONVERTED"] ?? []).reduce(
    (sum, l) => sum + (parseFloat(l.potentialValue ?? "0") || 0),
    0,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {STAGE_ORDER.reduce((s, st) => s + (board[st]?.length ?? 0), 0)}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 text-center">
          <p className="text-xs text-muted-foreground">Converted</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {board["CONVERTED"]?.length ?? 0}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 text-center">
          <p className="text-xs text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold tabular-nums text-primary">
            ₹{(totalRevenue / 100000).toFixed(1)}L
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map(({ stage, count, conversionRate }, idx) => {
          const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, 6) : 6;
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, ease: "easeOut" }}
              className="flex items-center gap-4"
            >
              <div className="w-24 text-right shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              <div className="flex-1 relative h-10">
                <motion.div
                  className={`h-full bg-gradient-to-r ${STAGE_COLORS[stage]} rounded-md flex items-center px-3`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ delay: idx * 0.08 + 0.1, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {count} leads
                  </span>
                </motion.div>
              </div>

              <div className="w-24 shrink-0 flex items-center gap-1">
                {conversionRate !== null && (
                  <>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={`text-xs font-medium ${
                        conversionRate >= 50
                          ? "text-emerald-600 dark:text-emerald-400"
                          : conversionRate >= 25
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {conversionRate}%
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-2 pt-2">
        {stages.map(({ stage, count }, idx) => (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.05 }}
            className={`rounded-lg border p-3 text-center ${STAGE_BG[stage]}`}
          >
            <p className="text-lg font-bold text-foreground">{count}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{STAGE_LABELS[stage]}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
