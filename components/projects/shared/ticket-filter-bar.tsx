"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { TicketPriority, TicketType } from "@/types/projects";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TicketType[] = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: { id: string; name: string | null; firstName: string | null; lastName: string | null }[];
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  className?: string;
}

export function TicketFilterBar({
  sprints,
  members,
  showTypeFilter = true,
  showSprintFilter = true,
  showAssigneeFilter = true,
  className,
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

  const hasFilters = !!(q || status || priority || type || sprintId || assigneeId);

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.delete("page"); // reset pagination on filter change
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [router, pathname]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Status */}
        <Select value={status} onValueChange={(v) => setParam("status", v === "ALL" ? "" : v)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priority} onValueChange={(v) => setParam("priority", v === "ALL" ? "" : v)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        {showTypeFilter && (
          <Select value={type} onValueChange={(v) => setParam("type", v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sprint */}
        {showSprintFilter && sprints && sprints.length > 0 && (
          <Select value={sprintId} onValueChange={(v) => setParam("sprintId", v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sprints</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Assignee */}
        {showAssigneeFilter && members && members.length > 0 && (
          <Select value={assigneeId} onValueChange={(v) => setParam("assigneeId", v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assignees</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.firstName ?? m.name ?? m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
