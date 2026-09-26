"use client";

import type { RefObject } from "react";
import { useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ListChecks, Users } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { GoalLevel, GoalListItem } from "@/hooks/api/goals";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";
import { LEVEL_OPTIONS, STATUS_CONFIG, STATUS_OPTIONS } from "./constants";

export const GOAL_LEVEL_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All levels" },
  ...LEVEL_OPTIONS,
];

export const GOAL_STATUS_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  ...STATUS_OPTIONS,
];

export const GOAL_FILTER_DEFINITIONS = [
  { param: "level", options: LEVEL_OPTIONS.map((option) => option.value) },
  { param: "status", options: STATUS_OPTIONS.map((option) => option.value) },
  { param: "ownerId" },
  { param: "health" },
  { param: "due" },
  { param: "scope" },
] as const;

export const GOAL_LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

interface GoalCardActionsProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
}

function GoalCardActions({ goal, onEdit, onDelete }: GoalCardActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit?.(goal), [goal, onEdit]);
  const handleDelete = useCallback(() => onDelete?.(goal), [goal, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Goal actions"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem> : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>Delete</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GoalCardProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
    >
      <div className="group relative">
        <div
          className={cn(
            PM_PANEL,
            "space-y-3 p-4 transition-[border-color,box-shadow] duration-200 group-hover:border-primary/40 group-hover:shadow-md",
          )}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <Link href={`/build/goals/${goal.id}`} className="min-w-0 flex-1">
              <p
                className={cn(TEXT_TWO_LINES, "text-sm font-medium leading-snug")}
                title={goal.title}
              >
                {goal.title}
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant={cfg.variant} className="shrink-0 text-micro">
                {cfg.label}
              </Badge>
              {onEdit || onDelete ? (
                <GoalCardActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{goal.progress}%</span>
            </div>
            <Progress
              value={goal.progress}
              className="h-1.5"
              aria-label={`${goal.title} progress`}
            />
          </div>

          <div className="flex min-w-0 items-center justify-between text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <TruncatedText text={ownerName ?? "Unassigned"} />
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              {goal.keyResultCount} KR{goal.keyResultCount === 1 ? "" : "s"}
            </span>
          </div>

          {goal.dueDate ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Due {format(new Date(goal.dueDate), "MMM d, yyyy")}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

interface GoalsListToolbarProps {
  listFilters: BuildListFiltersState;
  ownerOptions?: readonly BuildFilterOption[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function GoalsListToolbar({
  listFilters,
  ownerOptions,
  searchInputRef,
}: GoalsListToolbarProps) {
  const handleLevelChange = (value: string) =>
    listFilters.setValue("level", value);
  const handleStatusChange = (value: string) =>
    listFilters.setValue("status", value);
  const handleOwnerChange = (value: string) =>
    listFilters.setValue("ownerId", value);

  const ownerValue = listFilters.value("ownerId");
  const resolvedOwnerOptions: readonly BuildFilterOption[] = ownerOptions
    ? [{ value: BUILD_FILTER_ALL, label: "All owners" }, ...ownerOptions]
    : [{ value: BUILD_FILTER_ALL, label: "All owners" }];

  const filters = [
    {
      id: "level",
      label: "Level",
      active: listFilters.isActive("level"),
      control: (
        <BuildFilterSelect
          label="Level"
          value={listFilters.value("level")}
          onValueChange={handleLevelChange}
          options={GOAL_LEVEL_FILTER_OPTIONS}
        />
      ),
    },
    {
      id: "status",
      label: "Status",
      active: listFilters.isActive("status"),
      control: (
        <BuildFilterSelect
          label="Status"
          value={listFilters.value("status")}
          onValueChange={handleStatusChange}
          options={GOAL_STATUS_FILTER_OPTIONS}
        />
      ),
    },
    {
      id: "owner",
      label: "Owner",
      active: listFilters.isActive("ownerId"),
      control: (
        <BuildFilterSelect
          label="Owner"
          value={ownerValue}
          onValueChange={handleOwnerChange}
          options={resolvedOwnerOptions}
        />
      ),
    },
  ] as const;

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search goals…",
        label: "Search goals",
        inputRef: searchInputRef,
      }}
      filters={filters}
      onClearAll={listFilters.clearAll}
    />
  );
}
