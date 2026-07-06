"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/api/projects/projects";
import { useSetDueDateFromChat } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  ticketId?: number;
  projectId?: number;
}

export function SetDueDateDialog({
  open,
  onOpenChange,
  channelId,
  ticketId,
  projectId,
}: Props) {
  const [projectIdStr, setProjectIdStr] = useState("");
  const [ticketIdStr, setTicketIdStr] = useState("");
  const [dueDateValue, setDueDateValue] = useState("");

  useEffect(() => {
    if (open) {
      setProjectIdStr(projectId !== undefined ? String(projectId) : "");
      setTicketIdStr(ticketId !== undefined ? String(ticketId) : "");
      setDueDateValue("");
    }
  }, [open, projectId, ticketId]);

  const effectiveProjectId =
    projectId !== undefined ? projectId : projectIdStr ? Number(projectIdStr) : 0;

  const { data: projectsData, isLoading: loadingProjects } = useProjects(undefined, {
    enabled: open && projectId === undefined,
  });

  const dueDateMutation = useSetDueDateFromChat();

  const handleTicketIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTicketIdStr(e.target.value),
    [],
  );

  const handleDueDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDueDateValue(e.target.value),
    [],
  );

  const handleSubmit = useCallback(async () => {
    const resolvedTicketId =
      ticketId !== undefined ? ticketId : ticketIdStr ? Number(ticketIdStr) : 0;
    const resolvedProjectId =
      projectId !== undefined ? projectId : projectIdStr ? Number(projectIdStr) : 0;
    if (!resolvedProjectId || !resolvedTicketId || !dueDateValue) {
      toast.error("Fill in all fields");
      return;
    }
    try {
      await dueDateMutation.mutateAsync({
        channelId,
        ticketId: resolvedTicketId,
        projectId: resolvedProjectId,
        dueDate: dueDateValue,
      });
      toast.success("Due date set");
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [channelId, ticketId, ticketIdStr, projectId, projectIdStr, dueDateValue, dueDateMutation, onOpenChange]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const resolvedTicketId =
    ticketId !== undefined ? ticketId : ticketIdStr ? Number(ticketIdStr) : 0;
  const isReady =
    effectiveProjectId > 0 && resolvedTicketId > 0 && !!dueDateValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Due Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {projectId === undefined && (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select
                value={projectIdStr}
                onValueChange={setProjectIdStr}
                disabled={loadingProjects}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingProjects ? "Loading…" : "Select project"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectsData?.data.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.key} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {ticketId === undefined && (
            <div className="space-y-1.5">
              <Label htmlFor="sdd-ticket">Ticket ID</Label>
              <Input
                id="sdd-ticket"
                type="number"
                min={1}
                value={ticketIdStr}
                onChange={handleTicketIdChange}
                placeholder="e.g. 42"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sdd-date">Due Date</Label>
            <Input
              id="sdd-date"
              type="date"
              value={dueDateValue}
              onChange={handleDueDateChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={dueDateMutation.isPending || !isReady}
          >
            {dueDateMutation.isPending ? "Saving…" : "Set Date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
