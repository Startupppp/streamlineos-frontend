"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sprint } from "@/types/projects";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
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
  onBulkStatus: (value: string) => void;
  onBulkPriority: (value: string) => void;
  onBulkAssignee: (value: string) => void;
  onBulkSprint: (value: string) => void;
  onBulkLabel?: (value: string) => void;
  onClear: () => void;
}

export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  members,
  sprints,
  labels,
  hideSprint = false,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkSprint,
  onBulkLabel,
  onClear,
}: BulkActionBarProps) {
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
          <SelectTrigger className="w-[8.5rem] border-input bg-card text-xs">
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
          <SelectTrigger className="w-[8.5rem] border-input bg-card text-xs">
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
          <SelectTrigger className="w-[8.5rem] border-input bg-card text-xs">
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
            <SelectTrigger className="w-[8.5rem] border-input bg-card text-xs">
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
            <SelectTrigger className="w-40 border-input bg-card text-xs">
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
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-0 text-xs"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
