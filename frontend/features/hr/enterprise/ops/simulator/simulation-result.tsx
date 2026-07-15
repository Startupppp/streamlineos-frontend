"use client";

import { FlaskConical } from "lucide-react";
import { StateIllustration } from "@/components/illustrations";

interface Props {
  result: Record<string, unknown> | null;
  label?: string;
}

export function SimulationResult({ result, label }: Props) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 flex flex-1 flex-col items-center justify-center text-center text-muted-foreground min-h-[200px]">
        <StateIllustration preset="chart" className="h-24 w-24 mb-3" />
        <p className="text-sm font-medium text-foreground">Run a simulation to see results</p>
        {label && <p className="text-xs mt-1 text-muted-foreground">{label}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Simulation Result</p>
      </div>
      {Boolean(result.simulation) && (
        <p className="text-xs text-primary font-medium">{String(result.simulation)}</p>
      )}
      <div className="rounded-md bg-card/70 border border-primary/20 p-3">
        <pre className="text-xs text-foreground overflow-auto whitespace-pre-wrap max-h-64">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
