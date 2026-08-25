"use client";

import type { ProjectAiEvidence } from "@/types/projects/ai";

interface EvidenceStripProps {
  evidence: ProjectAiEvidence;
}

const chips = [
  { key: "done" as const, label: "Done", cls: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  { key: "inProgress" as const, label: "In Progress", cls: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  { key: "blocked" as const, label: "Blocked", cls: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  { key: "overdue" as const, label: "Overdue", cls: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
] as const;

export function EvidenceStrip({ evidence }: EvidenceStripProps) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {chips.map(({ key, label, cls }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-dense font-medium tabular-nums ${cls}`}
        >
          <span className="font-bold">{evidence[key]}</span>
          {label}
        </span>
      ))}
      {evidence.sprintProgressPct !== undefined && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-dense font-medium tabular-nums bg-muted text-muted-foreground border-border/70">
          <span className="font-bold">{evidence.sprintProgressPct}%</span>
          Sprint
        </span>
      )}
    </div>
  );
}
