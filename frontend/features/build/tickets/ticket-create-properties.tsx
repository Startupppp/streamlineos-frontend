"use client";

import { useState, memo, forwardRef } from "react";
import { Check, AlertTriangle, ArrowUp, Minus, ArrowDown, User, Zap, Tag } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { XIcon } from "@animateicons/react/lucide";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { LabelsSearchCommand } from "../shared/labels-search-command";
import { StatusConfigDot } from "../shared/status-badge";
import { buildStatusConfig, getStatusEntry } from "../shared/types";
import { getUserDisplayName, getUserInitials } from "../shared/resolve-user-name";
import type { ProjectStatusRecord, ProjectMemberRecord, Cycle, TicketLabel } from "@/types/projects";
import type { TicketPriority } from "@/types/projects";

const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-blue-400",
};

export interface CreateTicketPropertiesValue {
  status: string;
  priority: TicketPriority | null;
  assigneeId: string | null;
  points: number | null;
  labelIds: number[];
  cycleId: number | null;
}

interface TicketCreatePropertiesProps {
  value: CreateTicketPropertiesValue;
  onChange: (patch: Partial<CreateTicketPropertiesValue>) => void;
  projectStatuses: ProjectStatusRecord[];
  members: ProjectMemberRecord[];
  labels: TicketLabel[];
  cycles: Cycle[];
}

function RemoveLabelChipButton({ labelId, labelName, onRemove }: { labelId: number; labelName: string; onRemove: (id: number) => () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onRemove(labelId)}
      aria-label={`Remove ${labelName}`}
      className="inline-flex size-3 shrink-0 items-center justify-center leading-none hover:text-destructive transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={10} className="shrink-0" />
    </button>
  );
}

const PillButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { label: string }
>(function PillButton({ children, className, label, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export const TicketCreateProperties = memo(function TicketCreateProperties({
  value,
  onChange,
  projectStatuses,
  members,
  labels,
  cycles,
}: TicketCreatePropertiesProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [estimateInput, setEstimateInput] = useState(value.points !== null ? String(value.points) : "");

  const statusConfig = buildStatusConfig(projectStatuses);
  const statusList = projectStatuses.length > 0
    ? projectStatuses.map((s) => s.name)
    : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const currentStatus = getStatusEntry(statusConfig, value.status);

  const selectedAssignee = value.assigneeId
    ? members.find((m) => m.id === value.assigneeId) ?? null
    : null;

  const selectedLabels = labels.filter((l) => value.labelIds.includes(l.id));
  const selectedCycle = value.cycleId != null ? cycles.find((c) => c.id === value.cycleId) : null;

  const selectedPriorityDef = value.priority ? PRIORITIES.find((p) => p.value === value.priority) : null;
  const PriorityIcon = selectedPriorityDef?.Icon ?? Minus;
  const priorityColor = value.priority ? PRIORITY_COLOR[value.priority] : "text-muted-foreground";

  function makeStatusHandler(s: string) {
    return function selectStatus() {
      onChange({ status: s });
      setStatusOpen(false);
    };
  }

  function makePriorityHandler(p: TicketPriority) {
    return function selectPriority() {
      onChange({ priority: p });
      setPriorityOpen(false);
    };
  }

  function makeAssigneeHandler(id: string | null) {
    return function selectAssignee() {
      onChange({ assigneeId: id });
      setAssigneeOpen(false);
    };
  }

  function handleEstimateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setEstimateInput(next);
    const trimmed = next.trim();
    if (trimmed === "") {
      onChange({ points: null });
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange({ points: parsed });
    }
  }

  function handleLabelToggle(id: number) {
    const next = value.labelIds.includes(id)
      ? value.labelIds.filter((l) => l !== id)
      : [...value.labelIds, id];
    onChange({ labelIds: next });
  }

  function makeLabelRemoveHandler(id: number) {
    return function removeLabelChip() {
      handleLabelToggle(id);
    };
  }

  function handleLabelCreated(label: TicketLabel) {
    if (value.labelIds.includes(label.id)) return;
    onChange({ labelIds: [...value.labelIds, label.id] });
  }

  function makeCycleHandler(id: number | null) {
    return function selectCycle() {
      onChange({ cycleId: id });
      setCycleOpen(false);
    };
  }

  const labelsPillText =
    selectedLabels.length === 0
      ? null
      : selectedLabels.length === 1
        ? selectedLabels[0]?.name
        : `${selectedLabels[0]?.name} +${selectedLabels.length - 1}`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ResponsivePopover open={statusOpen} onOpenChange={setStatusOpen} modal>
          <ResponsivePopoverTrigger asChild>
            <PillButton label="Set status">
              <StatusConfigDot entry={currentStatus} />
              {currentStatus.label}
            </PillButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Status" className="z-[110] w-44 p-1" align="start">
            {statusList.map((s) => {
              const entry = getStatusEntry(statusConfig, s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={makeStatusHandler(s)}
                  className={cn(
                    popoverOptionBaseClass,
                    value.status === s && popoverOptionSelectedClass,
                  )}
                >
                  <StatusConfigDot entry={entry} />
                  {entry.label}
                  {value.status === s && <Check className="ml-auto h-3 w-3" />}
                </button>
              );
            })}
          </ResponsivePopoverContent>
        </ResponsivePopover>

        <ResponsivePopover open={priorityOpen} onOpenChange={setPriorityOpen} modal>
          <ResponsivePopoverTrigger asChild>
            <PillButton label="Set priority" className={priorityColor}>
              <PriorityIcon className="h-3.5 w-3.5 shrink-0" />
              {selectedPriorityDef?.label ?? "Priority"}
            </PillButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Priority" className="z-[110] w-36 p-1" align="start">
            {PRIORITIES.map(({ value: pVal, label, Icon }) => (
              <button
                key={pVal}
                type="button"
                onClick={makePriorityHandler(pVal)}
                className={cn(
                  popoverOptionBaseClass,
                  value.priority === pVal && popoverOptionSelectedClass,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", PRIORITY_COLOR[pVal])} />
                {label}
                {value.priority === pVal && <Check className="ml-auto h-3 w-3" />}
              </button>
            ))}
          </ResponsivePopoverContent>
        </ResponsivePopover>

        <ResponsivePopover open={assigneeOpen} onOpenChange={setAssigneeOpen} modal>
          <ResponsivePopoverTrigger asChild>
            <PillButton label="Set assignee">
              {selectedAssignee ? (
                <>
                  <Avatar className="h-4 w-4 shrink-0">
                    <AvatarImage src={resolveImageUrl(selectedAssignee.image)} />
                    <AvatarFallback className="text-[7px]">{getUserInitials(selectedAssignee)}</AvatarFallback>
                  </Avatar>
                  {getUserDisplayName(selectedAssignee)}
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Assignee</span>
                </>
              )}
            </PillButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Assignee" className="z-[110] w-52 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search members…" className="text-xs" />
              <CommandList className="max-h-48">
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">No members found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__unassigned__" onSelect={makeAssigneeHandler(null)}>
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">Unassigned</span>
                    {!value.assigneeId && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                  {members.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={getUserDisplayName(m)}
                      onSelect={makeAssigneeHandler(m.id)}
                    >
                      <Avatar className="mr-2 h-5 w-5 shrink-0">
                        <AvatarImage src={resolveImageUrl(m.image)} />
                        <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-left text-xs">{getUserDisplayName(m)}</span>
                      {m.id === value.assigneeId && <Check className="ml-auto h-3 w-3 shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </ResponsivePopoverContent>
        </ResponsivePopover>

        <div className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2">
          <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-label="Story points"
            value={estimateInput}
            onChange={handleEstimateChange}
            placeholder="0"
            className="h-6 w-12 border-0 bg-transparent px-1 py-0 text-xs font-mono tabular-nums shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 text-[10px] text-muted-foreground">pts</span>
        </div>

        <ResponsivePopover open={labelsOpen} onOpenChange={setLabelsOpen} modal>
          <ResponsivePopoverTrigger asChild>
            <PillButton label="Set labels">
              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {labelsPillText ? (
                <span className="inline-block max-w-[120px] truncate" title={labelsPillText}>{labelsPillText}</span>
              ) : (
                <span className="text-muted-foreground">Labels</span>
              )}
            </PillButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Labels" className="z-[110] w-48 p-1" align="start">
            <LabelsSearchCommand
              labels={labels}
              selectedIds={value.labelIds}
              onToggle={handleLabelToggle}
              onCreated={handleLabelCreated}
              open={labelsOpen}
            />
          </ResponsivePopoverContent>
        </ResponsivePopover>

        <ResponsivePopover open={cycleOpen} onOpenChange={setCycleOpen} modal>
          <ResponsivePopoverTrigger asChild>
            <PillButton label="Set cycle">
              <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current opacity-70" />
              {selectedCycle ? (
                <span className="inline-block max-w-[120px] truncate" title={selectedCycle.name}>{selectedCycle.name}</span>
              ) : (
                <span className="text-muted-foreground">Cycle</span>
              )}
            </PillButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Cycle" className="z-[110] w-56 p-1" align="start">
            <button
              type="button"
              onClick={makeCycleHandler(null)}
              className={cn(
                popoverOptionBaseClass,
                "text-muted-foreground",
                value.cycleId === null && popoverOptionSelectedClass,
              )}
            >
              No cycle
              {value.cycleId === null && <Check className="ml-auto h-3 w-3" />}
            </button>
            {cycles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={makeCycleHandler(c.id)}
                className={cn(
                  popoverOptionBaseClass,
                  value.cycleId === c.id && popoverOptionSelectedClass,
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    c.status === "active" ? "bg-green-500" : c.status === "completed" ? "bg-muted-foreground" : "bg-blue-400",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
                {c.status === "active" && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] text-green-600 border-green-500/40">Active</Badge>
                )}
                {value.cycleId === c.id && <Check className="ml-auto h-3 w-3" />}
              </button>
            ))}
          </ResponsivePopoverContent>
        </ResponsivePopover>
      </div>

      {selectedLabels.length > 0 && (
        <div className="flex w-full flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="h-5 gap-1 px-1.5 text-[10px] leading-none"
              style={{ borderLeft: `2px solid ${label.color ?? "#3b82f6"}` }}
            >
              <span className="leading-none">{label.name}</span>
              <RemoveLabelChipButton labelId={label.id} labelName={label.name} onRemove={makeLabelRemoveHandler} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});
