"use client";

import { cn } from "@/lib/utils";
import type { RiskProbability, RiskImpact } from "@/types/projects";
import type { RiskMatrixCell } from "@/hooks/api/build/governance-schema";
import { getRiskSeverity } from "./risk-severity";

const PROBABILITIES: RiskProbability[] = ["low", "medium", "high"];
const IMPACTS: RiskImpact[] = ["high", "medium", "low"];

const LEGEND = [
  { label: "Low", bg: "bg-muted" },
  { label: "Medium", bg: "bg-status-warning-surface" },
  { label: "High", bg: "bg-status-warning-surface" },
  { label: "Critical", bg: "bg-status-danger-surface" },
] as const;

interface RiskMatrixProps {
  cells: RiskMatrixCell[];
  onCellClick?: (probability: RiskProbability, impact: RiskImpact) => void;
  selectedCell?: { probability: RiskProbability; impact: RiskImpact } | null;
}

export function RiskMatrix({ cells, onCellClick, selectedCell }: RiskMatrixProps) {
  function cellCount(probability: RiskProbability, impact: RiskImpact): number {
    return cells.find((c) => c.probability === probability && c.impact === impact)?.openCount ?? 0;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 w-full max-w-xs">
      <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Risk Matrix <span className="text-micro normal-case font-normal">(open risks)</span>
      </p>
      <div className="flex gap-2">
        <div className="flex flex-col justify-around gap-1 pb-5">
          {IMPACTS.map((impact) => (
            <span key={impact} className="text-micro text-muted-foreground capitalize w-14 text-right pr-1 leading-none">
              {impact}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {IMPACTS.map((impact) => (
            <div key={impact} className="flex gap-1">
              {PROBABILITIES.map((prob) => {
                const sev = getRiskSeverity(prob, impact);
                const count = cellCount(prob, impact);
                const isSelected =
                  selectedCell?.probability === prob && selectedCell?.impact === impact;
                return (
                  <button
                    key={prob}
                    type="button"
                    aria-label={`${prob} probability, ${impact} impact: ${count} open ${count === 1 ? "risk" : "risks"}`}
                    aria-pressed={isSelected}
                    onClick={() => onCellClick?.(prob, impact)}
                    className={cn(
                      "flex-1 h-10 rounded flex items-center justify-center text-label font-semibold transition-all",
                      sev.className,
                      isSelected && "ring-2 ring-offset-1 ring-foreground/30",
                      onCellClick && "cursor-pointer hover:opacity-75",
                    )}
                  >
                    {count > 0 ? count : ""}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex gap-1">
            {PROBABILITIES.map((prob) => (
              <span key={prob} className="flex-1 text-center text-micro text-muted-foreground capitalize">
                {prob}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {LEGEND.map(({ label, bg }) => (
          <span key={label} className="flex items-center gap-1 text-micro text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-sm", bg)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
