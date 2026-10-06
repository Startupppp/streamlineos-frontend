"use client";

import { memo } from "react";
import { Check, User, Zap } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { StatusConfigDot } from "@/components/ui/status-config-dot";
import { getStatusEntry } from "@/lib/status-config";
import { getPriorityColor } from "../shared/priority-badge";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import type { ProjectStatusRecord, ProjectMemberRecord, Cycle, TicketLabel } from "@/types/projects";
import { PillButton, PRIORITIES } from "./ticket-create-properties-parts";
import { useTicketCreateProperties } from "./use-ticket-create-properties";
import { TicketCycleLabelPickers } from "./ticket-create-cycle-label-pickers";

export interface CreateTicketPropertiesValue {
  status: string;
  priority: string | null;
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

export const TicketCreateProperties = memo(function TicketCreateProperties({
  value,
  onChange,
  projectStatuses,
  members,
  labels,
  cycles,
}: TicketCreatePropertiesProps) {
  const {
    statusOpen,
    setStatusOpen,
    priorityOpen,
    setPriorityOpen,
    assigneeOpen,
    setAssigneeOpen,
    estimateInput,
    statusConfig,
    statusList,
    currentStatus,
    selectedAssignee,
    selectedPriorityDef,
    PriorityIcon,
    priorityColor,
    makeStatusHandler,
    makePriorityHandler,
    makeAssigneeHandler,
    handleEstimateChange,
  } = useTicketCreateProperties({ value, onChange, projectStatuses, members });

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
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
              <Icon className={cn("h-3.5 w-3.5 shrink-0", getPriorityColor(pVal))} />
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
                  <AvatarFallback className="text-micro">{getUserInitials(selectedAssignee)}</AvatarFallback>
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
            <CommandInput placeholder="Search members…" />
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
                      <AvatarFallback className="text-micro">{getUserInitials(m)}</AvatarFallback>
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
        <span className="shrink-0 text-micro text-muted-foreground">pts</span>
      </div>

      <TicketCycleLabelPickers
        labelIds={value.labelIds}
        labels={labels}
        cycleId={value.cycleId}
        cycles={cycles}
        onChange={onChange}
      />
    </div>
  );
});
