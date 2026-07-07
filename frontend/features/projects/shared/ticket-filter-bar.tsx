"use client";

import { useCallback, useMemo, useTransition, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, SlidersHorizontal, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketPriority, TicketType } from "@/types/projects";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TicketType[] = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];

const filterControlClassName =
  "h-8 bg-card border-border text-xs font-normal shadow-xs";

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  }[];
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
}

export function TicketFilterBar({
  sprints,
  members,
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

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const type = searchParams.get("type") ?? "";
  const sprintId = searchParams.get("sprintId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";

  const hasFilters = !!(status || priority || type || sprintId || assigneeId);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status) count += 1;
    if (priority) count += 1;
    if (type) count += 1;
    if (sprintId) count += 1;
    if (assigneeId) count += 1;
    return count;
  }, [status, priority, type, sprintId, assigneeId]);

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

  const clearAll = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      ["status", "priority", "type", "sprintId", "assigneeId", "page"].forEach((k) =>
        params.delete(k),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setParam("q", e.target.value);
  }

  function handleStatusChange(v: string) {
    setParam("status", v === "ALL" ? "" : v);
  }

  function handlePriorityChange(v: string) {
    setParam("priority", v === "ALL" ? "" : v);
  }

  function handleTypeChange(v: string) {
    setParam("type", v === "ALL" ? "" : v);
  }

  function handleSprintChange(v: string) {
    setParam("sprintId", v === "ALL" ? "" : v);
  }

  function handleAssigneeChange(v: string) {
    setParam("assigneeId", v === "ALL" ? "" : v);
  }

  function handleHideCompletedChange(checked: boolean) {
    onHideCompletedChange?.(checked);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-[120px] max-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={q}
          onChange={handleSearchChange}
          className={cn(filterControlClassName, "pl-7")}
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(filterControlClassName, "relative shrink-0 gap-1.5 px-2.5")}
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
        <PopoverContent align="start" className="w-64 space-y-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Status</Label>
            <Select value={status || "ALL"} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn(filterControlClassName, "w-full")}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Status
                </SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Priority</Label>
            <Select value={priority || "ALL"} onValueChange={handlePriorityChange}>
              <SelectTrigger className={cn(filterControlClassName, "w-full")}>
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Priority
                </SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showTypeFilter && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Type</Label>
              <Select value={type || "ALL"} onValueChange={handleTypeChange}>
                <SelectTrigger className={cn(filterControlClassName, "w-full")}>
                  <SelectValue placeholder="All Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Type
                  </SelectItem>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showSprintFilter && sprints && sprints.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Sprint</Label>
              <Select value={sprintId || "ALL"} onValueChange={handleSprintChange}>
                <SelectTrigger className={cn(filterControlClassName, "w-full")}>
                  <SelectValue placeholder="All Sprints" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Sprints
                  </SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showAssigneeFilter && members && members.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Assignee</Label>
              <Select value={assigneeId || "ALL"} onValueChange={handleAssigneeChange}>
                <SelectTrigger className={cn(filterControlClassName, "w-full")}>
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Assignees
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.firstName ?? m.name ?? m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="h-8 w-full text-xs text-muted-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear filters
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
