"use client";

import { useCallback, useMemo, useTransition, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, X, CheckCircle2 } from "lucide-react";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { FilterChip } from "./filter-chips";
import { FilterCommandMenu } from "./filter-command-menu";
import type { FilterState } from "./filter-command-menu";

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: Member[];
  statuses?: Array<{ name: string }>;
  projectId?: number;
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
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
  showTypeFilter = true,
  showSprintFilter = true,
  showAssigneeFilter = true,
  showDoneToggle = false,
  hideCompleted,
  onHideCompletedChange,
  doneCount = 0,
}: TicketFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

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
  const dueDateFrom = searchParams.get("dueDateFrom") ?? "";
  const dueDateTo = searchParams.get("dueDateTo") ?? "";

  const selectedStatuses = useMemo(() => parseMulti(statusParam), [statusParam]);
  const selectedPriorities = useMemo(() => parseMulti(priorityParam), [priorityParam]);
  const selectedTypes = useMemo(() => parseMulti(typeParam), [typeParam]);
  const selectedAssignees = useMemo(() => parseMulti(assigneeParam), [assigneeParam]);
  const selectedLabels = useMemo(() => parseMulti(labelsParam), [labelsParam]);
  const selectedCycles = useMemo(() => parseMulti(cycleParam), [cycleParam]);

  const statusOptions =
    statuses && statuses.length > 0
      ? statuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length) count += 1;
    if (selectedPriorities.length) count += 1;
    if (selectedTypes.length) count += 1;
    if (sprintParam) count += 1;
    if (selectedAssignees.length) count += 1;
    if (selectedLabels.length) count += 1;
    if (selectedCycles.length) count += 1;
    if (dueDateFrom || dueDateTo) count += 1;
    return count;
  }, [selectedStatuses, selectedPriorities, selectedTypes, sprintParam, selectedAssignees, selectedLabels, selectedCycles, dueDateFrom, dueDateTo]);

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
      ["status", "priority", "type", "sprintId", "assigneeId", "labels", "cycle", "dueDateFrom", "dueDateTo", "page"].forEach(
        (k) => params.delete(k),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setParam("q", e.target.value);
  }

  function handleHideCompletedChange(checked: boolean) {
    onHideCompletedChange?.(checked);
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

  const labelMap = useMemo(() => new Map(labels.map((l) => [String(l.id), l])), [labels]);
  const cycleMap = useMemo(() => new Map(cycles.map((c) => [String(c.id), c])), [cycles]);
  const memberMap = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m])),
    [members],
  );

  const filterState: FilterState = {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    sprintParam,
    dueDateFrom,
    dueDateTo,
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-[120px] max-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={q}
          onChange={handleSearchChange}
          className="h-8 bg-card border-border text-xs font-normal shadow-xs pl-7"
        />
      </div>

      <FilterCommandMenu
        activeFilterCount={activeFilterCount}
        statusOptions={statusOptions}
        members={members ?? []}
        labels={labels}
        cycles={cycles}
        sprints={sprints ?? []}
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
        onDueDateFromChange={handleDueDateFromChange}
        onDueDateToChange={handleDueDateToChange}
      />

      {showDoneToggle && onHideCompletedChange !== undefined && hideCompleted !== undefined && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2">
          <Label
            htmlFor="hide-done-filter"
            className="flex cursor-pointer items-center gap-1.5 text-xs font-normal"
          >
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
            Hide done
            {hideCompleted && doneCount > 0 && (
              <span className="text-muted-foreground">({doneCount})</span>
            )}
          </Label>
          <Switch
            id="hide-done-filter"
            checked={hideCompleted}
            onCheckedChange={handleHideCompletedChange}
            className="scale-90"
          />
        </div>
      )}

      {(selectedStatuses.length > 0 ||
        selectedPriorities.length > 0 ||
        selectedTypes.length > 0 ||
        selectedAssignees.length > 0 ||
        selectedLabels.length > 0 ||
        selectedCycles.length > 0 ||
        activeFilterCount > 0) && (
        <div className="flex flex-wrap items-center gap-1">
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
            const m = id === "__unassigned__" ? null : memberMap.get(id);
            const label = id === "__unassigned__" ? "Unassigned" : (m ? getUserDisplayName(m) : id);
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
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-2.5 w-2.5" />
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
