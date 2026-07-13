"use client";

import { FlaskConical } from "lucide-react";

interface Props {
  result: Record<string, unknown> | null;
  label?: string;
}

export function SimulationResult({ result, label }: Props) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[200px]">
        <FlaskConical className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Run a simulation to see results here.</p>
        {label && <p className="text-xs mt-1 opacity-70">{label}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Simulation Result</p>
      </div>
      {Boolean(result.simulation) && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{String(result.simulation)}</p>
      )}
      <div className="rounded-md bg-card/70 border border-blue-200/50 dark:border-blue-500/30 p-3">
        <pre className="text-xs text-foreground overflow-auto whitespace-pre-wrap max-h-64">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
