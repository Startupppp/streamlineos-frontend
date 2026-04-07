"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ListChecks, Plus } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useCreateTicket, useUpdateTicket } from "@/lib/hooks/trpc-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface Subtask {
  id: number;
  title?: string | null;
  status?: string | null;
  assignee?: {
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
}

interface TicketSubtasksProps {
  ticketId: number;
  projectId: number;
  subtasks: Subtask[];
}

export function TicketSubtasks({
  ticketId,
  projectId,
  subtasks,
}: TicketSubtasksProps) {
  const queryClient = useQueryClient();
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const subtasksDone = subtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = subtasks.length;
  const subtaskProgress =
    subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

  const subtaskQueryKey = [
    ...queryKeys.projects.all,
    "subtasks",
    { ticketId },
  ];

  const createSubtask = useCreateTicket({
    onSuccess: () => {
      setSubtaskTitle("");
      queryClient.invalidateQueries({ queryKey: subtaskQueryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(ticketId),
      });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create subtask"),
  });

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: subtaskQueryKey });
      }, 300);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update subtask"),
  });

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim()) return;
    createSubtask.mutate({
      projectId,
      title: subtaskTitle.trim(),
      type: "TASK",
      parentTicketId: ticketId,
    });
  };

  const handleToggleSubtask = (
    subtaskId: number,
    currentStatus: string | null | undefined
  ) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    updateTicketMutation.mutate({ ticketId: subtaskId, status: newStatus });
  };

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Subtasks</h4>
        {subtasksTotal > 0 && (
          <Badge variant="secondary" className="text-xs">
            {subtasksDone}/{subtasksTotal}
          </Badge>
        )}
      </div>

      {subtasksTotal > 0 && (
        <Progress value={subtaskProgress} className="h-1.5 mb-3" />
      )}

      <div className="space-y-1.5 mb-3">
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={sub.status === "DONE"}
              onCheckedChange={() => handleToggleSubtask(sub.id, sub.status)}
            />
            <span
              className={`text-sm flex-1 ${
                sub.status === "DONE"
                  ? "line-through text-muted-foreground"
                  : ""
              }`}
            >
              {sub.title}
            </span>
            {sub.assignee && (
              <Avatar className="h-7 w-7">
                <AvatarImage src={resolveImageUrl(sub.assignee.image)} />
                <AvatarFallback className="text-[10px]">
                  {sub.assignee.firstName?.[0]}
                  {sub.assignee.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={subtaskTitle}
          onChange={(e) => setSubtaskTitle(e.target.value)}
          placeholder="Add subtask..."
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddSubtask();
          }}
        />
        <Button
          size="sm"
          className="h-8"
          onClick={handleAddSubtask}
          disabled={!subtaskTitle.trim() || createSubtask.isPending}
          aria-label="Add subtask"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
