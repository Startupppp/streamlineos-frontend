"use client";

import { useCallback, useMemo, useTransition, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, SlidersHorizontal, X, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketPriority, TicketType } from "@/types/projects";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { FilterChip, FilterSection } from "./filter-chips";

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TicketType[] = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];

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

  function handleDueDateFromChange(e: ChangeEvent<HTMLInputElement>) {
    setParam("dueDateFrom", e.target.value);
  }

  function handleDueDateToChange(e: ChangeEvent<HTMLInputElement>) {
    setParam("dueDateTo", e.target.value);
  }

  function handleHideCompletedChange(checked: boolean) {
    onHideCompletedChange?.(checked);
  }

  function makeStatusToggle(status: string) {
    return function onStatusToggle() {
      toggleParam("status", selectedStatuses, status);
    };
  }

  function makePriorityToggle(priority: string) {
    return function onPriorityToggle() {
      toggleParam("priority", selectedPriorities, priority);
    };
  }

  function makeTypeToggle(type: string) {
    return function onTypeToggle() {
      toggleParam("type", selectedTypes, type);
    };
  }

  function makeAssigneeToggle(id: string) {
    return function onAssigneeToggle() {
      toggleParam("assigneeId", selectedAssignees, id);
    };
  }

  function makeLabelToggle(id: string) {
    return function onLabelToggle() {
      toggleParam("labels", selectedLabels, id);
    };
  }

  function makeCycleToggle(id: string) {
    return function onCycleToggle() {
      toggleParam("cycle", selectedCycles, id);
    };
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

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="relative h-8 shrink-0 gap-1.5 bg-card border-border px-2.5 text-xs font-normal shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="h-4 min-w-4 border-0 bg-blue-500 px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3 space-y-3 max-h-[80vh] overflow-y-auto">
          <FilterSection label="Status">
            <Command className="border border-border rounded-md">
              <CommandInput placeholder="Search status..." className="h-7 text-xs" />
              <CommandList className="max-h-32">
                <CommandEmpty className="py-1 text-center text-xs text-muted-foreground">No results.</CommandEmpty>
                <CommandGroup>
                  {statusOptions.map((s) => (
                    <CommandItem key={s} value={s} onSelect={makeStatusToggle(s)}>
                      <Check className={cn("mr-2 h-3 w-3", selectedStatuses.includes(s) ? "opacity-100" : "opacity-0")} />
                      <span className="text-xs">{s.replace(/_/g, " ")}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </FilterSection>

          <FilterSection label="Priority">
            <div className="flex flex-wrap gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={makePriorityToggle(p)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs border transition-colors",
                    selectedPriorities.includes(p)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  )}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </FilterSection>

          {showTypeFilter && (
            <FilterSection label="Type">
              <div className="flex flex-wrap gap-1">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={makeTypeToggle(t)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs border transition-colors",
                      selectedTypes.includes(t)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}

          {showAssigneeFilter && members && members.length > 0 && (
            <FilterSection label="Assignee">
              <Command className="border border-border rounded-md">
                <CommandInput placeholder="Search assignees..." className="h-7 text-xs" />
                <CommandList className="max-h-40">
                  <CommandEmpty className="py-1 text-center text-xs text-muted-foreground">No results.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__unassigned__" onSelect={makeAssigneeToggle("__unassigned__")}>
                      <Check className={cn("mr-2 h-3 w-3", selectedAssignees.includes("__unassigned__") ? "opacity-100" : "opacity-0")} />
                      <span className="text-xs">Unassigned</span>
                    </CommandItem>
                    {members.map((m) => (
                      <CommandItem key={m.id} value={getUserDisplayName(m)} onSelect={makeAssigneeToggle(m.id)}>
                        <Check className={cn("mr-2 h-3 w-3", selectedAssignees.includes(m.id) ? "opacity-100" : "opacity-0")} />
                        <span className="text-xs">{getUserDisplayName(m)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterSection>
          )}

          {labels.length > 0 && (
            <FilterSection label="Labels">
              <Command className="border border-border rounded-md">
                <CommandInput placeholder="Search labels..." className="h-7 text-xs" />
                <CommandList className="max-h-36">
                  <CommandEmpty className="py-1 text-center text-xs text-muted-foreground">No results.</CommandEmpty>
                  <CommandGroup>
                    {labels.map((l) => (
                      <CommandItem key={l.id} value={l.name} onSelect={makeLabelToggle(String(l.id))}>
                        <Check className={cn("mr-2 h-3 w-3", selectedLabels.includes(String(l.id)) ? "opacity-100" : "opacity-0")} />
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: l.color || "#3b82f6" }}
                        />
                        <span className="text-xs">{l.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterSection>
          )}

          {cycles.length > 0 && (
            <FilterSection label="Cycle">
              <Command className="border border-border rounded-md">
                <CommandInput placeholder="Search cycles..." className="h-7 text-xs" />
                <CommandList className="max-h-36">
                  <CommandEmpty className="py-1 text-center text-xs text-muted-foreground">No results.</CommandEmpty>
                  <CommandGroup>
                    {cycles.map((c) => (
                      <CommandItem key={c.id} value={c.name} onSelect={makeCycleToggle(String(c.id))}>
                        <Check className={cn("mr-2 h-3 w-3", selectedCycles.includes(String(c.id)) ? "opacity-100" : "opacity-0")} />
                        <span className="text-xs">{c.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterSection>
          )}

          <FilterSection label="Due date range">
            <div className="flex gap-2">
              <Input
                type="date"
                value={dueDateFrom}
                onChange={handleDueDateFromChange}
                className="h-7 flex-1 text-xs"
                aria-label="Due date from"
              />
              <span className="self-center text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={dueDateTo}
                onChange={handleDueDateToChange}
                className="h-7 flex-1 text-xs"
                aria-label="Due date to"
              />
            </div>
          </FilterSection>

          {showSprintFilter && sprints && sprints.length > 0 && (
            <FilterSection label="Sprint">
              <Command className="border border-border rounded-md">
                <CommandList className="max-h-32">
                  <CommandGroup>
                    {sprints.map((s) => (
                      <CommandItem key={s.id} value={s.name} onSelect={() => setParam("sprintId", sprintParam === String(s.id) ? "" : String(s.id))}>
                        <Check className={cn("mr-2 h-3 w-3", sprintParam === String(s.id) ? "opacity-100" : "opacity-0")} />
                        <span className="text-xs">{s.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterSection>
          )}

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

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="h-8 w-full text-xs text-muted-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear all filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

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

