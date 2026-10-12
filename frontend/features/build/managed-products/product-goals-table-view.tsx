"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { GoalListItem } from "@/hooks/api/goals";
import { LEVEL_LABEL } from "@/features/build/goals/constants";
import { getUserDisplayName } from "@/lib/person-display";


function GoalProgressCell({ goal }: { goal: GoalListItem }) {
  const progress = goal.progress ?? 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Progress value={progress} className="h-1.5 w-16 shrink-0" />
      <span className="font-mono tabular-nums text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}

const COLUMNS: DataTableColumn<GoalListItem>[] = [
  {
    key: "title",
    header: "Title",
    cell: (row) => (
      <span className="font-medium line-clamp-1">{row.title}</span>
    ),
  },
  {
    key: "level",
    header: "Level",
    cell: (row) => (
      <Badge variant="outline" className="text-xs">
        {LEVEL_LABEL[row.level as keyof typeof LEVEL_LABEL] ?? row.level}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant="secondary" className="text-xs">{row.status}</Badge>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => {
      const owner = row.owner;
      if (!owner) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className="text-xs">{getUserDisplayName(owner)}</span>
      );
    },
  },
  {
    key: "progress",
    header: "Progress",
    cell: (row) => <GoalProgressCell goal={row} />,
  },
  {
    key: "keyResults",
    header: "KRs",
    cell: (row) => (
      <span className="font-mono tabular-nums text-xs">{row.keyResultCount}</span>
    ),
  },
];

interface ProductGoalsTableViewProps {
  goals: GoalListItem[];
  onRowClick: (goal: GoalListItem) => void;
}

export function ProductGoalsTableView({ goals, onRowClick }: ProductGoalsTableViewProps) {
  const columns = useMemo(() => COLUMNS, []);
  return (
    <DataTable
      data={goals}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
    />
  );
}
