"use client";

import type { ProjectAiEvidence } from "@/types/projects/ai";

interface EvidenceStripProps {
  evidence: ProjectAiEvidence;
}

const chips = [
  { key: "done" as const, label: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
  { key: "inProgress" as const, label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200/70" },
  { key: "blocked" as const, label: "Blocked", cls: "bg-red-50 text-red-700 border-red-200/70" },
  { key: "overdue" as const, label: "Overdue", cls: "bg-amber-50 text-amber-700 border-amber-200/70" },
] as const;

export function EvidenceStrip({ evidence }: EvidenceStripProps) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-border/50">
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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium tabular-nums bg-slate-50 text-slate-600 border-slate-200/70">
          <span className="font-bold">{evidence.sprintProgressPct}%</span>
          Sprint
        </span>
      )}
    </div>
  );
}
