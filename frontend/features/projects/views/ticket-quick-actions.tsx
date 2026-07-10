"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, User } from "lucide-react";
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
import { useUpdateTicket, useDeleteTicket } from "@/hooks/api/projects/tickets";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/projects/shared/resolve-user-name";
import { popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { statusConfig, priorityConfig, buildStatusConfig, getStatusEntry } from "../shared/types";
import type { TicketPriority } from "@/types/projects";

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface TicketQuickActionsProps {
  ticketId: number;
  projectId?: number;
  currentStatus: string;
  currentPriority?: string | null;
  currentAssigneeId?: string | null;
  className?: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

export function TicketQuickActions({
  ticketId,
  projectId,
  currentStatus,
  currentPriority,
  currentAssigneeId,
  className,
  projectStatuses,
}: TicketQuickActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const canUpdate = useCan("projects:tickets:update");
  const canDelete = useCan("projects:tickets:delete");

  const { data: members = [] } = useProjectMembers(projectId ?? 0);

  const updateTicket = useUpdateTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket updated"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteTicket = useDeleteTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket deleted"),
    onError: (error) => toast.error(getErrorMessage(error)),
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
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
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
