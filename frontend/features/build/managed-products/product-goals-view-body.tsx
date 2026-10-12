"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { PmStaggerList } from "@/components/pm-chrome";
import { GoalCard, GOAL_LEVEL_ORDER } from "@/features/build/goals/goals-list-shared";
import { LEVEL_LABEL } from "@/features/build/goals/constants";
import { ProductGoalsTableView } from "./product-goals-table-view";
import type { GoalListItem } from "@/hooks/api/goals";

type GoalsViewMode = "list" | "tree" | "table";

interface ProductGoalsViewBodyProps {
  viewMode: GoalsViewMode;
  flatGoals: GoalListItem[];
  totalGoals: number;
  canManage: boolean;
  onEdit: (goal: GoalListItem) => void;
  onDelete: (goal: GoalListItem) => void;
  onUnlink: (goal: GoalListItem) => void;
  onCheckIn: (goal: GoalListItem) => void;
  onRowClick: (goal: GoalListItem) => void;
}

function resolveGoalActions(
  goal: GoalListItem,
  canManage: boolean,
  handlers: {
    onEdit: (goal: GoalListItem) => void;
    onDelete: (goal: GoalListItem) => void;
    onUnlink: (goal: GoalListItem) => void;
    onCheckIn: (goal: GoalListItem) => void;
  },
) {
  const allowed = goal.allowedActions;
  const hasAllowedActions = allowed.length > 0;
  const allows = (action: string) => !hasAllowedActions || allowed.includes(action);
  return {
    onEdit: canManage && allows("update") ? handlers.onEdit : undefined,
    onDelete: canManage && allows("delete") ? handlers.onDelete : undefined,
    onUnlink: canManage && allows("unlink") ? handlers.onUnlink : undefined,
    onCheckIn: handlers.onCheckIn,
  };
}

export function ProductGoalsViewBody({
  viewMode,
  flatGoals,
  totalGoals,
  canManage,
  onEdit,
  onDelete,
  onUnlink,
  onCheckIn,
  onRowClick,
}: ProductGoalsViewBodyProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, GoalListItem[]>();
    for (const level of GOAL_LEVEL_ORDER) map.set(level, []);
    for (const goal of flatGoals) {
      const bucket = map.get(goal.level);
      if (bucket) bucket.push(goal);
      else map.set(goal.level, [goal]);
    }
    return map;
  }, [flatGoals]);

  if (viewMode === "table") {
    return <ProductGoalsTableView goals={flatGoals} onRowClick={onRowClick} />;
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{totalGoals}</span>
          {totalGoals === 1 ? " goal linked to this product" : " goals linked to this product"}
        </p>
        <PmStaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flatGoals.map((goal) => {
            const actions = resolveGoalActions(goal, canManage, { onEdit, onDelete, onUnlink, onCheckIn });
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={actions.onEdit}
                onDelete={actions.onDelete}
                onUnlink={actions.onUnlink}
                onCheckIn={actions.onCheckIn}
              />
            );
          })}
        </PmStaggerList>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {GOAL_LEVEL_ORDER.map((level) => {
        const levelGoals = grouped.get(level) ?? [];
        if (levelGoals.length === 0) return null;
        return (
          <div key={level} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-foreground">
                {LEVEL_LABEL[level]}
              </h2>
              <Badge variant="secondary" className="text-micro">
                {levelGoals.length}
              </Badge>
            </div>
            <PmStaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {levelGoals.map((goal) => {
                const actions = resolveGoalActions(goal, canManage, { onEdit, onDelete, onUnlink, onCheckIn });
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={actions.onEdit}
                    onDelete={actions.onDelete}
                    onUnlink={actions.onUnlink}
                    onCheckIn={actions.onCheckIn}
                  />
                );
              })}
            </PmStaggerList>
          </div>
        );
      })}
    </div>
  );
}
