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
import { useCreateTaskFromMessage } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  messageId: number;
  defaultTitle: string;
}

export function ConvertToTaskDialog({
  open,
  onOpenChange,
  channelId,
  messageId,
  defaultTitle,
}: Props) {
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<"TASK" | "BUG">("TASK");
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setProjectId("");
      setType("TASK");
    }
  }, [open, defaultTitle]);

  const { data: projectsData, isLoading: loadingProjects } = useProjects(
    undefined,
    { enabled: open },
  );
  const createTask = useCreateTaskFromMessage();

  const handleSubmit = useCallback(async () => {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    try {
      await createTask.mutateAsync({
        channelId,
        messageId,
        projectId: Number(projectId),
        type,
        title: title.trim() || undefined,
      });
      toast.success(`Created ${type}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [channelId, messageId, projectId, type, title, createTask, onOpenChange]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    [],
  );

  const handleTypeChange = useCallback((v: string) => setType(v as "TASK" | "BUG"), []);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ctd-title">Title</Label>
            <Input
              id="ctd-title"
              value={title}
              onChange={handleTitleChange}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
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
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK">Task</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTask.isPending || !projectId}
          >
            {createTask.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
