"use client";

import { PackageOpen } from "lucide-react";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";
import { PlanningCard } from "./planning-card";
import type { PlanningTicket } from "./planning-card";
import {
  PRIORITY_OPTIONS,
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  type TicketFilters,
} from "./use-ticket-filters";

interface PlanningBacklogColumnProps {
  backlogFilters: TicketFilters;
  totalCount: number;
  selectedBacklog: Set<number>;
  onToggle: (id: number) => void;
  onBulkAdd: () => void;
  onAdd: (id: number) => void;
  projectKey?: string | null;
  isMutating?: boolean;
}

export function PlanningBacklogColumn({
  backlogFilters,
  totalCount,
  selectedBacklog,
  onToggle,
  onBulkAdd,
  onAdd,
  projectKey,
  isMutating,
}: PlanningBacklogColumnProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          Backlog ({backlogFilters.filtered.length}{backlogFilters.hasActiveFilters ? ` / ${totalCount}` : ""})
        </h4>
        {selectedBacklog.size > 0 && (
          <AnimatedIconButton
            type="button"
            variant="default"
            size="sm"
            icon={PlusIcon}
            iconSize={14}
            onClick={onBulkAdd}
            disabled={isMutating}
            className="text-xs gap-1"
            aria-label={`Add ${selectedBacklog.size} selected tickets to sprint`}
          >
            Add {selectedBacklog.size} selected
          </AnimatedIconButton>
        )}
      </div>

      <div className="space-y-1.5">
        <SearchInput
          value={backlogFilters.search}
          onValueChange={backlogFilters.setSearch}
          placeholder="Search title or ID…"
          aria-label="Search backlog tickets"
        />

        <div className="flex gap-1.5 flex-wrap">
          <Select value={backlogFilters.filterPriority} onValueChange={backlogFilters.setFilterPriority}>
            <SelectTrigger className="w-[90px]" aria-label="Filter by priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All priorities</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={backlogFilters.filterType} onValueChange={backlogFilters.setFilterType}>
            <SelectTrigger className="w-[80px]" aria-label="Filter by type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={backlogFilters.filterStatus} onValueChange={backlogFilters.setFilterStatus}>
            <SelectTrigger className="w-[80px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ").charAt(0) + s.replace("_", " ").slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {backlogFilters.assigneeOptions.length > 0 && (
            <Select value={backlogFilters.filterAssignee} onValueChange={backlogFilters.setFilterAssignee}>
              <SelectTrigger className="w-[90px]" aria-label="Filter by assignee">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All assignees</SelectItem>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {backlogFilters.assigneeOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{getUserDisplayName(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {backlogFilters.hasActiveFilters && (
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="sm"
              icon={XIcon}
              iconSize={12}
              className="text-xs gap-1 px-2"
              onClick={backlogFilters.clearFilters}
              aria-label="Clear all filters"
            >
              Clear
            </AnimatedIconButton>
          )}
        </div>
      </div>

      <Droppable droppableId="backlog">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            aria-label="Backlog tickets"
            className={cn(
              "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
              snapshot.isDraggingOver && "bg-primary/5 border-primary/30",
            )}
          >
            {backlogFilters.filtered.map((ticket: PlanningTicket, index: number) => (
              <PlanningCard
                key={ticket.id}
                ticket={ticket}
                index={index}
                projectKey={projectKey}
                isSelected={selectedBacklog.has(ticket.id)}
                onToggleSelect={onToggle}
                actionIcon="plus"
                onAction={onAdd}
                isPending={isMutating}
              />
            ))}
            {provided.placeholder}
            {backlogFilters.filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <PackageOpen className="w-8 opacity-40" aria-hidden />
                <p className="text-xs text-center">
                  {backlogFilters.hasActiveFilters
                    ? "No tickets match the active filters"
                    : "No backlog tickets"}
                </p>
                {backlogFilters.hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={backlogFilters.clearFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
