"use client";

import { useState, memo, forwardRef } from "react";
import { Check, AlertTriangle, ArrowUp, Minus, ArrowDown, User, Zap, Tag } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { XIcon } from "@animateicons/react/lucide";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      className="hover:text-destructive transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={10} />
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
  const [estimateOpen, setEstimateOpen] = useState(false);
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

  function handleEstimateConfirm() {
    const parsed = parseInt(estimateInput, 10);
    onChange({ points: Number.isFinite(parsed) && parsed >= 0 ? parsed : null });
    setEstimateOpen(false);
  }

  function handleEstimateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleEstimateConfirm();
    if (e.key === "Escape") setEstimateOpen(false);
  }

  function handleEstimateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEstimateInput(e.target.value);
  }

  function makeLabelToggleHandler(id: number) {
    return function toggleLabel() {
      const next = value.labelIds.includes(id)
        ? value.labelIds.filter((l) => l !== id)
        : [...value.labelIds, id];
      onChange({ labelIds: next });
    };
  }

  function makeCycleHandler(id: number | null) {
    return function selectCycle() {
      onChange({ cycleId: id });
      setCycleOpen(false);
    };
  }

  function handleEstimateOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setEstimateInput(value.points !== null ? String(value.points) : "");
    }
    setEstimateOpen(nextOpen);
  }

  const labelsPillText =
    selectedLabels.length === 0
      ? null
      : selectedLabels.length === 1
        ? selectedLabels[0]?.name
        : `${selectedLabels[0]?.name} +${selectedLabels.length - 1}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Popover open={statusOpen} onOpenChange={setStatusOpen} modal>
        <PopoverTrigger asChild>
          <PillButton label="Set status">
            <span className={cn("h-2 w-2 rounded-full shrink-0", currentStatus.dotColor)} />
            {currentStatus.label}
          </PillButton>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-44 p-1" align="start">
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
                <span className={cn("h-2 w-2 rounded-full shrink-0", entry.dotColor)} />
                {entry.label}
                {value.status === s && <Check className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <Popover open={priorityOpen} onOpenChange={setPriorityOpen} modal>
        <PopoverTrigger asChild>
          <PillButton label="Set priority" className={priorityColor}>
            <PriorityIcon className="h-3.5 w-3.5 shrink-0" />
            {selectedPriorityDef?.label ?? "Priority"}
          </PillButton>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-36 p-1" align="start">
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
        </PopoverContent>
      </Popover>

      <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen} modal>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-52 p-0" align="start">
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
                    <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                    {m.id === value.assigneeId && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={estimateOpen} onOpenChange={handleEstimateOpenChange} modal>
        <PopoverTrigger asChild>
          <PillButton label="Set estimate">
            <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {value.points !== null ? (
              <span>{value.points} pt{value.points !== 1 ? "s" : ""}</span>
            ) : (
              <span className="text-muted-foreground">Estimate</span>
            )}
          </PillButton>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-36 p-3" align="start">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Story points</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step={1}
              value={estimateInput}
              onChange={handleEstimateChange}
              onKeyDown={handleEstimateKeyDown}
              placeholder="0"
              className="text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={handleEstimateConfirm}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Set
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={labelsOpen} onOpenChange={setLabelsOpen} modal>
        <PopoverTrigger asChild>
          <PillButton label="Set labels">
            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {labelsPillText ? (
              <span className="truncate max-w-[120px]">{labelsPillText}</span>
            ) : (
              <span className="text-muted-foreground">Labels</span>
            )}
          </PillButton>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-48 p-1" align="start">
          {labels.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No labels available.</p>
          ) : (
            <Command>
              <CommandInput placeholder="Search labels…" className="text-xs" />
              <CommandList className="max-h-40">
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">No labels found.</CommandEmpty>
                <CommandGroup>
                  {labels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={makeLabelToggleHandler(label.id)}
                    >
                      <span
                        className="mr-2 h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: label.color ?? "#3b82f6" }}
                      />
                      <span className="text-xs truncate">{label.name}</span>
                      {value.labelIds.includes(label.id) && <Check className="ml-auto h-3 w-3" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      <Popover open={cycleOpen} onOpenChange={setCycleOpen} modal>
        <PopoverTrigger asChild>
          <PillButton label="Set cycle">
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current opacity-70" />
            {selectedCycle ? (
              <span className="truncate max-w-[120px]">{selectedCycle.name}</span>
            ) : (
              <span className="text-muted-foreground">Cycle</span>
            )}
          </PillButton>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-56 p-1" align="start">
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
              <span className="truncate flex-1">{c.name}</span>
              {c.status === "active" && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] text-green-600 border-green-500/40">Active</Badge>
              )}
              {value.cycleId === c.id && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="h-5 gap-1 px-1.5 text-[10px]"
              style={{ borderLeft: `2px solid ${label.color ?? "#3b82f6"}` }}
            >
              {label.name}
              <button
                type="button"
                onClick={makeLabelToggleHandler(label.id)}
                aria-label={`Remove ${label.name}`}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});
