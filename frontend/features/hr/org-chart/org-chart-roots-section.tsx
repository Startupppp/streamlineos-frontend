"use client";

import type { LucideIcon } from "lucide-react";
import type { OrgChartNode } from "./types";
import { OrgChartBranch } from "./org-chart-branch";

interface OrgChartRootsSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  nodes: readonly OrgChartNode[];
  dashed?: boolean;
  focusedId: string | null;
  onSelect: (employee: OrgChartNode) => void;
}

export function OrgChartRootsSection({
  icon: Icon,
  title,
  description,
  nodes,
  dashed = false,
  focusedId,
  onSelect,
}: OrgChartRootsSectionProps) {
  if (nodes.length === 0) return null;

  return (
    <section
      className={
        dashed
          ? "min-w-max space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3"
          : "min-w-max space-y-2 rounded-lg border border-border bg-muted/20 p-3"
      }
    >
      <div className="flex items-start gap-2">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {nodes.map((employee) => (
          <OrgChartBranch
            key={employee.id}
            employee={employee}
            lineage={[]}
            focusedId={focusedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}
