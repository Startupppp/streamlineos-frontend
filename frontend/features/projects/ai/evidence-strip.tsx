"use client";

import type { ProjectAiEvidence } from "@/types/projects/ai";

interface EvidenceStripProps {
  evidence: ProjectAiEvidence;
}

const chips = [
  { key: "done" as const, label: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  { key: "inProgress" as const, label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  { key: "blocked" as const, label: "Blocked", cls: "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  { key: "overdue" as const, label: "Overdue", cls: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
] as const;

export function EvidenceStrip({ evidence }: EvidenceStripProps) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {chips.map(({ key, label, cls }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium tabular-nums ${cls}`}
        >
          <span className="font-bold">{evidence[key]}</span>
          {label}
        </span>
      ))}
      {evidence.sprintProgressPct !== undefined && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium tabular-nums bg-muted text-muted-foreground border-border/70 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30">
          <span className="font-bold">{evidence.sprintProgressPct}%</span>
          Sprint
        </span>
      )}
    </div>
  );
}
