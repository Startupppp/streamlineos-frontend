"use client";

import { cn } from "@/lib/utils";
import type { Risk, RiskProbability, RiskImpact } from "@/types/projects";
import { getRiskSeverity } from "./risk-severity";

const PROBABILITIES: RiskProbability[] = ["low", "medium", "high"];
const IMPACTS: RiskImpact[] = ["high", "medium", "low"];

const LEGEND = [
  { label: "Low", bg: "bg-slate-100" },
  { label: "Medium", bg: "bg-amber-100" },
  { label: "High", bg: "bg-orange-100" },
  { label: "Critical", bg: "bg-red-100" },
] as const;

interface RiskMatrixProps {
  risks: Risk[];
  onCellClick?: (probability: RiskProbability, impact: RiskImpact) => void;
  selectedCell?: { probability: RiskProbability; impact: RiskImpact } | null;
}

export function RiskMatrix({ risks, onCellClick, selectedCell }: RiskMatrixProps) {
  const openRisks = risks.filter((r) => r.status !== "closed" && r.status !== "accepted");

  function cellCount(probability: RiskProbability, impact: RiskImpact): number {
    return openRisks.filter((r) => r.probability === probability && r.impact === impact).length;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 w-full max-w-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Risk Matrix <span className="text-[10px] normal-case font-normal">(open risks)</span>
      </p>
      <div className="flex gap-2">
        <div className="flex flex-col justify-around gap-1 pb-5">
          {IMPACTS.map((impact) => (
            <span key={impact} className="text-[10px] text-muted-foreground capitalize w-14 text-right pr-1 leading-none">
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
                    onClick={() => onCellClick?.(prob, impact)}
                    className={cn(
                      "flex-1 h-10 rounded flex items-center justify-center text-[13px] font-semibold transition-all",
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
              <span key={prob} className="flex-1 text-center text-[10px] text-muted-foreground capitalize">
                {prob}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {LEGEND.map(({ label, bg }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-sm", bg)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
