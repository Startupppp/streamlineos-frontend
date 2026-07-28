"use client";

import { memo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { Sprint } from "@/types/projects";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { PM_TOOLBAR } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name?: string | null;
  firstName?: string | null;
}

interface LabelOption {
  id: number;
  name: string;
  color?: string | null;
}

interface BulkActionBarProps {
  selectedCount: number;
  members: Member[];
  sprints: Sprint[];
  labels?: LabelOption[];
  hideSprint?: boolean;
  projectId?: number;
  excludeIds?: Set<string | number>;
  onBulkStatus: (value: string) => void;
  onBulkPriority: (value: string) => void;
  onBulkAssignee: (value: string) => void;
  onBulkSprint: (value: string) => void;
  onBulkLabel?: (value: string) => void;
  onBulkParent?: (parentTicketId: number | null) => void;
  onClear: () => void;
}

function ParentPickerPopover({
  projectId,
  excludeIds,
  onPick,
}: {
  projectId: number;
  excludeIds: Set<string | number>;
  onPick: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results } = useTicketSearch(q, {
    enabled: open,
  });

  const filtered = (results ?? []).filter(
    (r) => r.projectId === projectId && !excludeIds.has(r.id),
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleRemoveParent() {
    onPick(null);
    setOpen(false);
  }

  function handlePickResult(id: number) {
    onPick(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs">
          Set parent
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          ref={inputRef}
          placeholder="Search tickets…"
          value={q}
          onChange={handleInputChange}
          className="mb-2 h-8 text-xs"
        />
        <div className="max-h-52 overflow-y-auto">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
            onClick={handleRemoveParent}
          >
            Remove parent
          </button>
          {filtered.length === 0 && q.length > 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No tickets found.</p>
          ) : null}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => handlePickResult(r.id)}
            >
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {r.projectKey}-{r.ticketNumber}
              </span>
              <span className={cn("flex-1 text-xs", TEXT_ONE_LINE)}>{r.title}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  members,
  sprints,
  labels,
  hideSprint = false,
  projectId,
  excludeIds,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkSprint,
  onBulkLabel,
  onBulkParent,
  onClear,
}: BulkActionBarProps) {
  const resolvedExcludeIds = excludeIds ?? new Set<string | number>();

  return (
    <div
      className={cn(
        PM_TOOLBAR,
        "sticky top-0 z-10 mb-2 gap-2 border-b border-border bg-background/95 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
        {selectedCount} selected
      </span>
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide sm:ml-auto [&>*]:shrink-0">
        <Select onValueChange={onBulkStatus}>
          <SelectTrigger className="w-[8.5rem]">
            <SelectValue placeholder="Set Status" />
          </SelectTrigger>
          <SelectContent>
            {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={onBulkPriority}>
          <SelectTrigger className="w-[8.5rem]">
            <SelectValue placeholder="Set Priority" />
          </SelectTrigger>
          <SelectContent>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={onBulkAssignee}>
          <SelectTrigger className="w-[8.5rem]">
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <span className={TEXT_ONE_LINE}>{getUserDisplayName(m)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onBulkLabel !== undefined && (labels?.length ?? 0) > 0 ? (
          <Select onValueChange={onBulkLabel}>
            <SelectTrigger className="w-[8.5rem]">
              <SelectValue placeholder="Add Label" />
            </SelectTrigger>
            <SelectContent>
              {(labels ?? []).map((l) => (
                <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                  <span className={TEXT_ONE_LINE}>{l.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {!hideSprint ? (
          <Select onValueChange={onBulkSprint}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Move to Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog" className="text-xs">
                Backlog (remove sprint)
              </SelectItem>
              {sprints
                .filter((s) => s.status !== "COMPLETED")
                .map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    <span className={TEXT_ONE_LINE}>{s.name}</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : null}
        {onBulkParent !== undefined && projectId !== undefined ? (
          <ParentPickerPopover
            projectId={projectId}
            excludeIds={resolvedExcludeIds}
            onPick={onBulkParent}
          />
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-0 text-xs"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <XIcon size={14} />
        </Button>
      </div>
    </div>
  );
});
