"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProjects, useTickets } from "@/hooks/api/projects";
import { useAddGoalLink } from "@/hooks/api/goals";
import { getErrorMessage } from "@/lib/get-error-message";

interface AddLinkDialogProps {
  goalId: number;
  onClose: () => void;
}

export function AddLinkDialog({ goalId, onClose }: AddLinkDialogProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [ticketId, setTicketId] = useState<string>("");
  const { data: projectsData } = useProjects();
  const numericProjectId = projectId ? Number(projectId) : 0;
  const { data: ticketsData } = useTickets(numericProjectId);
  const addLink = useAddGoalLink(goalId);

  function handleProjectChange(v: string) {
    setProjectId(v);
    setTicketId("");
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit() {
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const payload = ticketId
      ? { ticketId: Number(ticketId) }
      : { projectId: Number(projectId) };
    addLink.mutate(payload, {
      onSuccess: () => {
        toast.success("Work item linked");
        onClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link work item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projectsData?.data.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ticket (optional)</Label>
            <Select value={ticketId} onValueChange={setTicketId} disabled={!projectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Link the whole project" />
              </SelectTrigger>
              <SelectContent>
                {ticketsData?.data.map((ticket) => (
                  <SelectItem key={ticket.id} value={String(ticket.id)}>
                    {ticket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            disabled={!projectId}
            isPending={addLink.isPending}
            loadingText="Linking…"
          >
            Link
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
