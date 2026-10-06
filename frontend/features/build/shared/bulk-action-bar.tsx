"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cycle } from "@/types/projects";
import { getUserDisplayName } from "@/lib/person-display";
import { PM_TOOLBAR } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  buildStatusConfig,
  resolveStatusOptions,
  type StatusOptionSource,
} from "@/features/build/shared/types";
import { ParentPickerPopover } from "./parent-picker-popover";

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
  cycles: Cycle[];
  statuses: readonly StatusOptionSource[] | undefined;
  labels?: LabelOption[];
  hideCycle?: boolean;
  projectId?: number;
  excludeIds?: Set<string | number>;
  onBulkStatus: (value: string) => void;
  onBulkPriority: (value: string) => void;
  onBulkAssignee: (value: string) => void;
  onBulkCycle: (value: string) => void;
  onBulkLabel?: (value: string) => void;
  onBulkParent?: (parentTicketId: number | null) => void;
  onBulkArchive?: () => void;
  onBulkExport?: () => void;
  onClear: () => void;
}

const DYNAMIC_SELECT_TRIGGER_CLASS =
  "w-fit min-w-40 max-w-[calc(100vw-3rem)] sm:max-w-80";

export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  members,
  cycles,
  statuses,
  labels,
  hideCycle = false,
  projectId,
  excludeIds,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkCycle,
  onBulkLabel,
  onBulkParent,
  onBulkArchive,
  onBulkExport,
  onClear,
}: BulkActionBarProps) {
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const resolvedExcludeIds = excludeIds ?? new Set<string | number>();
  const statusOptions = resolveStatusOptions(statuses);
  const statusLabels = buildStatusConfig(statusOptions);

  if (!canUpdate) return null;

  return (
    <div
      className={cn(
        PM_TOOLBAR,
        "sticky top-0 z-10 mb-2 gap-2 border-b border-border bg-background/95 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-dense font-normal tabular-nums text-primary">
        {selectedCount} selected
      </span>
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide sm:ml-auto [&>*]:shrink-0">
        <Select onValueChange={onBulkStatus}>
          <SelectTrigger className={DYNAMIC_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Set Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s.name} value={s.name} className="text-xs">
                {statusLabels[s.name]?.label ?? s.name.replace(/_/g, " ")}
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
        {canAssign ? <Select onValueChange={onBulkAssignee}>
          <SelectTrigger className={DYNAMIC_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <span className={TEXT_ONE_LINE}>{getUserDisplayName(m)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select> : null}
        {onBulkLabel !== undefined && (labels?.length ?? 0) > 0 ? (
          <Select onValueChange={onBulkLabel}>
            <SelectTrigger className={DYNAMIC_SELECT_TRIGGER_CLASS}>
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
        {!hideCycle ? (
          <Select onValueChange={onBulkCycle}>
            <SelectTrigger className={DYNAMIC_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Move to Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog" className="text-xs">
                Backlog (remove cycle)
              </SelectItem>
              {cycles
                .filter((c) => c.status !== "completed")
                .map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    <span className={TEXT_ONE_LINE}>{c.name}</span>
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
        {onBulkArchive !== undefined ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-1.5 text-xs text-destructive hover:text-destructive"
            onClick={onBulkArchive}
          >
            Archive
          </Button>
        ) : null}
        {onBulkExport !== undefined ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-1.5 text-xs"
            onClick={onBulkExport}
          >
            Export
          </Button>
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
