"use client";

import type { ReactNode } from "react";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { Progress } from "@/components/ui/progress";
import type { GoalListItem } from "@/hooks/api/goals";
import { getUserDisplayName } from "@/lib/person-display";
import { PRODUCT_GOAL_LAYOUT } from "@/lib/renderer/build/product-goal-layout";

function GoalProgressCell({ goal }: { goal: GoalListItem }) {
  const progress = goal.progress ?? 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Progress value={progress} className="h-1.5 w-16 shrink-0" />
      <span className="font-mono tabular-nums text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}

const CELLS: Record<string, (row: GoalListItem) => ReactNode> = {
  owner: (row) =>
    row.owner ? (
      <span className="text-xs">{getUserDisplayName(row.owner)}</span>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    ),
  progress: (row) => <GoalProgressCell goal={row} />,
};

function rowKey(row: GoalListItem): string {
  return String(row.id);
}

interface ProductGoalsTableViewProps {
  goals: GoalListItem[];
  onRowClick: (goal: GoalListItem) => void;
}

export function ProductGoalsTableView({ goals, onRowClick }: ProductGoalsTableViewProps) {
  const layout = useTenantLayout(PRODUCT_GOAL_LAYOUT);
  return (
    <RecordList
      layout={layout}
      rows={goals}
      getRowKey={rowKey}
      cells={CELLS}
      onRowClick={onRowClick}
    />
  );
}
