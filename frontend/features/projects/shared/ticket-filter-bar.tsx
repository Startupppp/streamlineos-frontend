"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleCheckIcon } from "@animateicons/react/lucide";
import { X } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { FilterChip } from "./filter-chips";
import { FilterCommandMenu } from "./filter-command-menu";
import type { FilterState } from "./filter-command-menu";
import type { StatusFilterOption } from "./filter-category-submenu";
import { buildStatusConfig } from "@/features/projects/shared/types";

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: Member[];
  statuses?: Array<{ name: string; color?: string | null; type?: string | null }>;
  projectId?: number;
  projectOptions?: ProjectOption[];
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
  className?: string;
  align?: "start" | "end";
}

function parseMulti(param: string): string[] {
  return param.split(",").filter(Boolean);
}

function toggleMulti(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function TicketFilterBar({
  sprints,
  members,
  statuses,
  projectId,
  projectOptions,
  showTypeFilter = true,
  showSprintFilter = true,
  showAssigneeFilter = true,
  showDoneToggle = false,
  hideCompleted,
  onHideCompletedChange,
  doneCount = 0,
  className,
  align = "start",
}: TicketFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { iconRef: hideDoneIconRef, hoverHandlers: hideDoneHoverHandlers } = useAnimatedIcon();

  const { data: cycles = [] } = useCycles(projectId ?? 0);
  const { data: labels = [] } = useProjectLabels(projectId);

  const q = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const sprintParam = searchParams.get("sprintId") ?? "";
  const assigneeParam = searchParams.get("assigneeId") ?? "";
  const labelsParam = searchParams.get("labels") ?? "";
  const cycleParam = searchParams.get("cycle") ?? "";
  const projectIdsParam = searchParams.get("projectIds") ?? "";
  const dueDateFrom = searchParams.get("dueDateFrom") ?? "";
  const dueDateTo = searchParams.get("dueDateTo") ?? "";

  const selectedStatuses = useMemo(() => parseMulti(statusParam), [statusParam]);
  const selectedPriorities = useMemo(() => parseMulti(priorityParam), [priorityParam]);
  const selectedTypes = useMemo(() => parseMulti(typeParam), [typeParam]);
  const selectedAssignees = useMemo(() => parseMulti(assigneeParam), [assigneeParam]);
  const selectedLabels = useMemo(() => parseMulti(labelsParam), [labelsParam]);
  const selectedCycles = useMemo(() => parseMulti(cycleParam), [cycleParam]);
  const selectedProjectIds = useMemo(() => parseMulti(projectIdsParam), [projectIdsParam]);

  const statusItems = useMemo<StatusFilterOption[]>(() => {
    if (statuses && statuses.length > 0) {
      return statuses.map((s) => ({
        name: s.name,
        color: s.color ?? null,
        type: s.type ?? null,
      }));
    }
    return (["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((name) => ({
      name,
      color: null,
      type: null,
    }));
  }, [statuses]);

  const statusConfig = useMemo(() => buildStatusConfig(statusItems), [statusItems]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length) count += 1;
    if (selectedPriorities.length) count += 1;
    if (selectedTypes.length) count += 1;
    if (sprintParam) count += 1;
    if (selectedAssignees.length) count += 1;
    if (selectedLabels.length) count += 1;
    if (selectedCycles.length) count += 1;
    if (selectedProjectIds.length) count += 1;
    if (dueDateFrom || dueDateTo) count += 1;
    return count;
  }, [selectedStatuses, selectedPriorities, selectedTypes, sprintParam, selectedAssignees, selectedLabels, selectedCycles, selectedProjectIds, dueDateFrom, dueDateTo]);

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const toggleParam = useCallback(
    (key: string, current: string[], value: string) => {
      const next = toggleMulti(current, value);
      setParam(key, next.join(","));
    },
    [setParam],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      ["status", "priority", "type", "sprintId", "assigneeId", "labels", "cycle", "projectIds", "dueDateFrom", "dueDateTo", "page"].forEach(
        (k) => params.delete(k),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const [localSearch, setLocalSearch] = useState(q);
  const debouncedLocalSearch = useDebouncedValue(localSearch, 300);
  const prevDebouncedRef = useRef(debouncedLocalSearch);

  useEffect(() => {
    if (debouncedLocalSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedLocalSearch;
    if (debouncedLocalSearch !== q) {
      setParam("q", debouncedLocalSearch);
    }
  }, [debouncedLocalSearch, q, setParam]);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
  }

  function handleHideDoneClick() {
    onHideCompletedChange?.(!hideCompleted);
  }

  function handleToggleStatus(status: string) {
    toggleParam("status", selectedStatuses, status);
  }

  function handleTogglePriority(priority: string) {
    toggleParam("priority", selectedPriorities, priority);
  }

  function handleToggleType(type: string) {
    toggleParam("type", selectedTypes, type);
  }

  function handleToggleAssignee(id: string) {
    toggleParam("assigneeId", selectedAssignees, id);
  }

  function handleToggleLabel(id: string) {
    toggleParam("labels", selectedLabels, id);
  }

  function handleToggleCycle(id: string) {
    toggleParam("cycle", selectedCycles, id);
  }

  function handleToggleSprint(id: string) {
    setParam("sprintId", sprintParam === id ? "" : id);
  }

  function handleDueDateFromChange(value: string) {
    setParam("dueDateFrom", value);
  }

  function handleDueDateToChange(value: string) {
    setParam("dueDateTo", value);
  }

  function makeRemoveStatus(status: string) {
    return function onRemoveStatus() {
      const next = selectedStatuses.filter((v) => v !== status);
      setParam("status", next.join(","));
    };
  }

  function makeRemovePriority(priority: string) {
    return function onRemovePriority() {
      const next = selectedPriorities.filter((v) => v !== priority);
      setParam("priority", next.join(","));
    };
  }

  function makeRemoveType(type: string) {
    return function onRemoveType() {
      const next = selectedTypes.filter((v) => v !== type);
      setParam("type", next.join(","));
    };
  }

  function makeRemoveAssignee(id: string) {
    return function onRemoveAssignee() {
      const next = selectedAssignees.filter((v) => v !== id);
      setParam("assigneeId", next.join(","));
    };
  }

  function makeRemoveLabel(id: string) {
    return function onRemoveLabel() {
      const next = selectedLabels.filter((v) => v !== id);
      setParam("labels", next.join(","));
    };
  }

  function makeRemoveCycle(id: string) {
    return function onRemoveCycle() {
      const next = selectedCycles.filter((v) => v !== id);
      setParam("cycle", next.join(","));
    };
  }

  function handleToggleProject(id: string) {
    toggleParam("projectIds", selectedProjectIds, id);
  }

  function makeRemoveProject(id: string) {
    return function onRemoveProject() {
      const next = selectedProjectIds.filter((v) => v !== id);
      setParam("projectIds", next.join(","));
    };
  }

  const labelMap = useMemo(() => new Map(labels.map((l) => [String(l.id), l])), [labels]);
  const cycleMap = useMemo(() => new Map(cycles.map((c) => [String(c.id), c])), [cycles]);
  const memberMap = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m])),
    [members],
  );
  const projectMap = useMemo(
    () => new Map((projectOptions ?? []).map((p) => [String(p.id), p])),
    [projectOptions],
  );

  const filterState: FilterState = {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    sprintParam,
    dueDateFrom,
    dueDateTo,
  };

  const hasFilterChips =
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedTypes.length > 0 ||
    selectedAssignees.length > 0 ||
    selectedLabels.length > 0 ||
    selectedCycles.length > 0 ||
    selectedProjectIds.length > 0;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          align === "end" && "sm:justify-end",
        )}
      >
        <div
          className={cn(
            "relative shrink-0",
            align === "end"
              ? "w-[140px] sm:w-[168px]"
              : "min-w-[120px] max-w-[220px] flex-1",
          )}
        >
          <SearchInput
            placeholder="Search..."
            value={localSearch}
            onValueChange={handleSearchChange}
          />
        </div>

        <FilterCommandMenu
          activeFilterCount={activeFilterCount}
          statusItems={statusItems}
          statusConfig={statusConfig}
          members={members ?? []}
          labels={labels}
          cycles={cycles}
          sprints={sprints ?? []}
          projectOptions={projectOptions}
          showTypeFilter={showTypeFilter}
          showSprintFilter={showSprintFilter}
          showAssigneeFilter={showAssigneeFilter}
          filterState={filterState}
          onToggleStatus={handleToggleStatus}
          onTogglePriority={handleTogglePriority}
          onToggleType={handleToggleType}
          onToggleAssignee={handleToggleAssignee}
          onToggleLabel={handleToggleLabel}
          onToggleCycle={handleToggleCycle}
          onToggleSprint={handleToggleSprint}
          onToggleProject={handleToggleProject}
          onDueDateFromChange={handleDueDateFromChange}
          onDueDateToChange={handleDueDateToChange}
        />

        {showDoneToggle && onHideCompletedChange !== undefined && hideCompleted !== undefined && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleHideDoneClick}
                  className={cn(
                    "shrink-0",
                    hideCompleted && "border-primary bg-primary/10 text-primary",
                  )}
                  aria-label={doneCount > 0 ? `Hide done (${doneCount})` : "Hide done"}
                  aria-pressed={hideCompleted}
                  {...hideDoneHoverHandlers}
                >
                  <CircleCheckIcon
                    ref={hideDoneIconRef}
                    size={14}
                    className={hideCompleted ? "text-primary" : undefined}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {doneCount > 0 ? `Hide done (${doneCount})` : "Hide done"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-transparent px-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            Clear all
          </button>
        )}
      </div>

      {hasFilterChips && (
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-1",
            align === "end" && "sm:justify-end",
          )}
        >
          {selectedStatuses.map((s) => (
            <FilterChip key={`status-${s}`} label={s.replace(/_/g, " ")} onRemove={makeRemoveStatus(s)} />
          ))}
          {selectedPriorities.map((p) => (
            <FilterChip key={`priority-${p}`} label={p.charAt(0) + p.slice(1).toLowerCase()} onRemove={makeRemovePriority(p)} />
          ))}
          {selectedTypes.map((t) => (
            <FilterChip key={`type-${t}`} label={t.charAt(0) + t.slice(1).toLowerCase()} onRemove={makeRemoveType(t)} />
          ))}
          {selectedAssignees.map((id) => {
            const label =
              id === "@me"
                ? "Me"
                : id === "__unassigned__"
                ? "Unassigned"
                : (memberMap.get(id) ? getUserDisplayName(memberMap.get(id)!) : id);
            return <FilterChip key={`assignee-${id}`} label={label} onRemove={makeRemoveAssignee(id)} />;
          })}
          {selectedLabels.map((id) => {
            const l = labelMap.get(id);
            return (
              <FilterChip
                key={`label-${id}`}
                label={l?.name ?? id}
                color={l?.color ?? undefined}
                onRemove={makeRemoveLabel(id)}
              />
            );
          })}
          {selectedCycles.map((id) => {
            const c = cycleMap.get(id);
            return <FilterChip key={`cycle-${id}`} label={c?.name ?? id} onRemove={makeRemoveCycle(id)} />;
          })}
          {selectedProjectIds.map((id) => {
            const p = projectMap.get(id);
            return <FilterChip key={`project-${id}`} label={p?.name ?? id} onRemove={makeRemoveProject(id)} />;
          })}
        </div>
      )}
    </div>
  );
}
