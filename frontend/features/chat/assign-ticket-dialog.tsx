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
import { useProjects, useProjectMembers } from "@/hooks/api/projects/projects";
import { useAssignTicketFromChat } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  ticketId?: number;
  projectId?: number;
}

export function AssignTicketDialog({
  open,
  onOpenChange,
  channelId,
  ticketId,
  projectId,
}: Props) {
  const [projectIdStr, setProjectIdStr] = useState("");
  const [ticketIdStr, setTicketIdStr] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  useEffect(() => {
    if (open) {
      setProjectIdStr(projectId !== undefined ? String(projectId) : "");
      setTicketIdStr(ticketId !== undefined ? String(ticketId) : "");
      setAssigneeId("");
    }
  }, [open, projectId, ticketId]);

  const effectiveProjectId =
    projectId !== undefined ? projectId : projectIdStr ? Number(projectIdStr) : 0;

  const { data: projectsData, isLoading: loadingProjects } = useProjects(undefined, {
    enabled: open && projectId === undefined,
  });

  const { data: members, isLoading: loadingMembers } =
    useProjectMembers(effectiveProjectId);

  const assign = useAssignTicketFromChat();

  const handleTicketIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTicketIdStr(e.target.value),
    [],
  );

  const handleSubmit = useCallback(async () => {
    const resolvedTicketId =
      ticketId !== undefined ? ticketId : ticketIdStr ? Number(ticketIdStr) : 0;
    const resolvedProjectId =
      projectId !== undefined ? projectId : projectIdStr ? Number(projectIdStr) : 0;
    if (!resolvedProjectId || !resolvedTicketId || !assigneeId) {
      toast.error("Fill in all fields");
      return;
    }
    try {
      await assign.mutateAsync({
        channelId,
        ticketId: resolvedTicketId,
        projectId: resolvedProjectId,
        assigneeId,
      });
      toast.success("Ticket assigned");
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [channelId, ticketId, ticketIdStr, projectId, projectIdStr, assigneeId, assign, onOpenChange]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const resolvedTicketId =
    ticketId !== undefined ? ticketId : ticketIdStr ? Number(ticketIdStr) : 0;
  const isReady = effectiveProjectId > 0 && resolvedTicketId > 0 && !!assigneeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
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
              <Label htmlFor="atd-ticket">Ticket ID</Label>
              <Input
                id="atd-ticket"
                type="number"
                min={1}
                value={ticketIdStr}
                onChange={handleTicketIdChange}
                placeholder="e.g. 42"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={assigneeId}
              onValueChange={setAssigneeId}
              disabled={loadingMembers || effectiveProjectId === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingMembers ? "Loading…" : "Select member"}
                />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user?.name ?? m.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assign.isPending || !isReady}>
            {assign.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
