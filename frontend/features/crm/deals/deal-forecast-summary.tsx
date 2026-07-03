"use client";

import { useMemo } from "react";
import { TrendingUp, Target, Handshake } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatINRCompact } from "@/lib/format-utils";
import type { Deal } from "@/types/crm";

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

interface DealForecastSummaryProps {
  deals: Deal[];
}

export function DealForecastSummary({ deals }: DealForecastSummaryProps) {
  const { totalPipeline, weightedForecast, commitForecast } = useMemo(() => {
    const open = deals.filter((d) => d.stage !== "LOST");
    let pipeline = 0;
    let weighted = 0;
    let commit = 0;

    for (const d of open) {
      const value = Number(d.value ?? 0);
      const prob =
        d.probability != null && d.probability > 0
          ? d.probability
          : (STAGE_PROBABILITY[d.stage] ?? 0);

      pipeline += value;
      weighted += value * (prob / 100);

      if (d.stage === "NEGOTIATION" || d.stage === "WON") {
        commit += value;
      }
    }

    return { totalPipeline: pipeline, weightedForecast: weighted, commitForecast: commit };
  }, [deals]);

  return (
    <StatCardGrid cols={3}>
      <StatCard
        label="Total Pipeline"
        value={formatINRCompact(totalPipeline)}
        icon={TrendingUp}
        tone="blue"
      />
      <StatCard
        label="Weighted Forecast"
        value={formatINRCompact(weightedForecast)}
        icon={Target}
        tone="violet"
      />
      <StatCard
        label="Commit Forecast"
        value={formatINRCompact(commitForecast)}
        icon={Handshake}
        tone="emerald"
      />
    </StatCardGrid>
  );
}
