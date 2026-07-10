"use client";

import { useState } from "react";
import { Trash2, User, Check } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useUpdateTicket, useDeleteTicket, useAddLabelToTicket, useRemoveLabelFromTicket } from "@/hooks/api/projects/tickets";
import { useProjectMembers, useProjectLabels } from "@/hooks/api/projects/projects";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useSprints } from "@/hooks/api/projects/sprints";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/projects/shared/resolve-user-name";
import { popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { statusConfig, priorityConfig, buildStatusConfig, getStatusEntry, typeConfig } from "../shared/types";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import type { TicketPriority } from "@/types/projects";

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const INLINE_TYPES = ["TASK", "BUG", "STORY", "EPIC"] as const;

interface TicketQuickActionsProps {
  ticketId: number;
  projectId?: number;
  currentStatus: string;
  currentPriority?: string | null;
  currentAssigneeId?: string | null;
  currentType?: string | null;
  currentLabelIds?: number[];
  currentCycleId?: number | null;
  currentSprintId?: number | null;
  className?: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

export function TicketQuickActions({
  ticketId,
  projectId,
  currentStatus,
  currentPriority,
  currentAssigneeId,
  currentType,
  currentLabelIds = [],
  currentCycleId,
  currentSprintId,
  className,
  projectStatuses,
}: TicketQuickActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const canUpdate = useCan("projects:tickets:update");
  const canDelete = useCan("projects:tickets:delete");

  const { data: members = [] } = useProjectMembers(projectId ?? 0);
  const { data: labels = [] } = useProjectLabels(projectId);
  const { data: cycles = [] } = useCycles(projectId ?? 0);
  const { data: allSprints = [] } = useSprints(projectId);
  const sprints = allSprints.filter((s) => s.status !== "COMPLETED");

  const updateTicket = useUpdateTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket updated"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteTicket = useDeleteTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket deleted"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addLabel = useAddLabelToTicket({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeLabel = useRemoveLabelFromTicket({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!projectId) return null;
  if (!canUpdate && !canDelete) return null;

  const resolvedStatusConfig =
    projectStatuses && projectStatuses.length > 0
      ? buildStatusConfig(projectStatuses)
      : statusConfig;

  const statusList: string[] =
    projectStatuses && projectStatuses.length > 0
      ? projectStatuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  function makeStatusHandler(status: string) {
    return function selectStatus() {
      updateTicket.mutate({ ticketId, status });
    };
  }

  function makePriorityHandler(priority: TicketPriority) {
    return function selectPriority() {
      updateTicket.mutate({ ticketId, priority });
    };
  }

  function makeAssigneeHandler(userId: string) {
    return function selectAssignee() {
      updateTicket.mutate({ ticketId, assigneeId: userId });
    };
  }

  function makeTypeHandler(type: string) {
    return function selectType() {
      updateTicket.mutate({ ticketId, type });
    };
  }

  function makeLabelToggleHandler(labelId: number) {
    return function toggleLabel() {
      if (currentLabelIds.includes(labelId)) {
        removeLabel.mutate({ ticketId, projectId, labelId });
      } else {
        addLabel.mutate({ ticketId, projectId, labelId });
      }
    };
  }

  function makeCycleHandler(cycleId: number | null) {
    return function selectCycle() {
      updateTicket.mutate({ ticketId, cycleId });
    };
  }

  function makeSprintHandler(sprintId: number | null) {
    return function selectSprint() {
      updateTicket.mutate({ ticketId, sprintId });
    };
  }

  function handleUnassign() {
    updateTicket.mutate({ ticketId, assigneeIds: [] });
  }

  function handleDeleteSelect() {
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    deleteTicket.mutate({ ticketId });
    setDeleteDialogOpen(false);
  }

  function handleWrapperMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleWrapperClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className={cn("shrink-0", dropdownOpen && "opacity-100", className)}
      onMouseDown={handleWrapperMouseDown}
      onClick={handleWrapperClick}
    >
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6" {...hoverHandlers}>
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canUpdate && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {statusList.map((status) => {
                    const entry = getStatusEntry(resolvedStatusConfig, status);
                    return (
                      <DropdownMenuItem
                        key={status}
                        className={cn(
                          status === currentStatus && popoverOptionSelectedClass
                        )}
                        onSelect={makeStatusHandler(status)}
                      >
                        <span
                          className={cn(
                            "mr-2 inline-block h-2 w-2 rounded-full shrink-0",
                            entry.dotColor
                          )}
                        />
                        {entry.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change priority</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {PRIORITIES.map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      className={cn(
                        priority === currentPriority && popoverOptionSelectedClass
                      )}
                      onSelect={makePriorityHandler(priority)}
                    >
                      <span
                        className={cn(
                          "mr-2 text-xs font-bold",
                          priorityConfig[priority]?.color
                        )}
                      >
                        •
                      </span>
                      {priorityConfig[priority]?.label ?? priority}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change assignee</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Assignee
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className={cn(
                      !currentAssigneeId && popoverOptionSelectedClass
                    )}
                    onSelect={handleUnassign}
                  >
                    <User className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    Unassigned
                  </DropdownMenuItem>
                  {members.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      className={cn(
                        member.id === currentAssigneeId &&
                          popoverOptionSelectedClass
                      )}
                      onSelect={makeAssigneeHandler(member.id)}
                    >
                      <Avatar className="mr-2 h-5 w-5 shrink-0">
                        <AvatarImage src={resolveImageUrl(member.image)} />
                        <AvatarFallback className="text-[7px]">
                          {getUserInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {getUserDisplayName(member)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change type</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {INLINE_TYPES.map((t) => (
                    <DropdownMenuItem
                      key={t}
                      className={cn(currentType === t && popoverOptionSelectedClass)}
                      onSelect={makeTypeHandler(t)}
                    >
                      <TicketTypeIcon type={t} size="sm" />
                      <span className="ml-2">{typeConfig[t]?.label ?? t}</span>
                      {currentType === t && <Check className="ml-auto h-3 w-3" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {labels.length === 0 && (
                    <DropdownMenuItem disabled>No labels</DropdownMenuItem>
                  )}
                  {labels.map((label) => {
                    const active = currentLabelIds.includes(label.id);
                    return (
                      <DropdownMenuItem
                        key={label.id}
                        className={cn(active && popoverOptionSelectedClass)}
                        onSelect={makeLabelToggleHandler(label.id)}
                      >
                        <span
                          className="mr-2 h-2.5 w-2.5 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: label.color ?? undefined }}
                        />
                        <span className="truncate">{label.name}</span>
                        {active && <Check className="ml-auto h-3 w-3 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Cycle</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem
                    className={cn(!currentCycleId && popoverOptionSelectedClass)}
                    onSelect={makeCycleHandler(null)}
                  >
                    No cycle
                    {!currentCycleId && <Check className="ml-auto h-3 w-3" />}
                  </DropdownMenuItem>
                  {cycles.map((cycle) => (
                    <DropdownMenuItem
                      key={cycle.id}
                      className={cn(currentCycleId === cycle.id && popoverOptionSelectedClass)}
                      onSelect={makeCycleHandler(cycle.id)}
                    >
                      <span className="truncate">{cycle.name}</span>
                      {currentCycleId === cycle.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Sprint</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem
                    className={cn(!currentSprintId && popoverOptionSelectedClass)}
                    onSelect={makeSprintHandler(null)}
                  >
                    No sprint
                    {!currentSprintId && <Check className="ml-auto h-3 w-3" />}
                  </DropdownMenuItem>
                  {sprints.map((sprint) => (
                    <DropdownMenuItem
                      key={sprint.id}
                      className={cn(currentSprintId === sprint.id && popoverOptionSelectedClass)}
                      onSelect={makeSprintHandler(sprint.id)}
                    >
                      <span className="truncate">{sprint.name}</span>
                      {currentSprintId === sprint.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {canUpdate && canDelete && <DropdownMenuSeparator />}

          {canDelete && (
            <DropdownMenuItem variant="destructive"
              onSelect={handleDeleteSelect}
            >
              <Trash2 className="mr-2 h-4 w-4 shrink-0" />
              Delete ticket
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ticket and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
