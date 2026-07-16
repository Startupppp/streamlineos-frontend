"use client";

import type { SnapshotDiff, FieldDiff } from "./types";

interface DiffSectionProps {
  diff: SnapshotDiff;
}

const SECTION_LABELS: Record<keyof Omit<SnapshotDiff, "isSameSnapshot">, string> = {
  highlights: "Highlights",
  blockers: "Blockers",
  nextActions: "Next Actions",
};

function hasDiffItems(fd: FieldDiff): boolean {
  return fd.added.length > 0 || fd.removed.length > 0;
}

interface FieldDiffRowsProps {
  fd: FieldDiff;
  label: string;
}

function FieldDiffRows({ fd, label }: FieldDiffRowsProps) {
  if (!hasDiffItems(fd)) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {fd.added.map((item) => (
        <p key={item} className="flex items-start gap-1 text-emerald-700 dark:text-emerald-400">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {item}
        </p>
      ))}
      {fd.removed.map((item) => (
        <p key={item} className="text-muted-foreground line-through">
          {item}
        </p>
      ))}
    </div>
  );
}

export function DiffSection({ diff }: DiffSectionProps) {
  if (diff.isSameSnapshot) {
    return (
      <p className="text-[12px] text-muted-foreground">No changes since last snapshot</p>
    );
  }

  const sections = (
    ["highlights", "blockers", "nextActions"] as const
  ).filter((key) => hasDiffItems(diff[key]));

  if (sections.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-[12px] space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        What changed since last
      </p>
      {sections.map((key) => (
        <FieldDiffRows key={key} fd={diff[key]} label={SECTION_LABELS[key]} />
      ))}
    </div>
  );
}
