"use client";

import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { LEAD_PRIORITY_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/renderer/crm/lead-layout";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import type { TeamMember } from "./leads-types";

/**
 * What a row can do, in the one slot the engine leaves for it.
 *
 * The table this replaces edited status, priority and owner in the cells
 * themselves, behind a double-click nobody discovers. `RecordList` has no
 * editable cell and should not grow one — a cell renders a value — so the same
 * three transforms live here instead, on a row menu that says what it does.
 */

export interface LeadRowControlsProps {
  lead: Lead;
  onStatusChange: (lead: Lead, status: PipelineStatus) => void;
  onPriorityChange: (leadId: number, priority: LeadPriority) => void;
  onAssign: (leadId: number, userId: string) => void;
  teamMembers: readonly TeamMember[];
  canUpdate: boolean;
  canAssign: boolean;
}

export function LeadRowControls({
  lead,
  onStatusChange,
  onPriorityChange,
  onAssign,
  teamMembers,
  canUpdate,
  canAssign,
}: LeadRowControlsProps) {
  const handleStatusSelect = useCallback(
    (value: string) => {
      const next = LEAD_STATUS_OPTIONS.find((option) => option.value === value);
      if (next && next.value !== lead.status) onStatusChange(lead, next.value);
    },
    [lead, onStatusChange],
  );

  const handlePrioritySelect = useCallback(
    (value: string) => {
      const next = LEAD_PRIORITY_OPTIONS.find((option) => option.value === value);
      if (next && next.value !== lead.priority) onPriorityChange(lead.id, next.value);
    },
    [lead.id, lead.priority, onPriorityChange],
  );

  const handleAssignSelect = useCallback(
    (value: string) => {
      if (value !== lead.assignedToId) onAssign(lead.id, value);
    },
    [lead.id, lead.assignedToId, onAssign],
  );

  // Opening a menu or ticking a box is not opening the lead, and the whole row
  // is a link.
  const stopClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const stopKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  if (!canUpdate && !canAssign) return null;

  return (
    <div className="flex items-center justify-end" onClick={stopClick} onKeyDown={stopKeyDown}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton
            icon={EllipsisIcon}
            iconSize={16}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Actions for ${lead.name}`}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="truncate">{lead.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {canUpdate ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={lead.status} onValueChange={handleStatusSelect}>
                    {LEAD_STATUS_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={lead.priority ?? ""}
                    onValueChange={handlePrioritySelect}
                  >
                    {LEAD_PRIORITY_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}

          {canAssign ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Owner</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={lead.assignedToId ?? ""}
                  onValueChange={handleAssignSelect}
                >
                  {teamMembers.map((member) => (
                    <DropdownMenuRadioItem key={member.id} value={member.id}>
                      {member.name ?? "Unnamed"}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
