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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteTask, type TaskWithBucket } from "@/lib/api/hooks/tasks";
import { useLeadDetail } from "@/lib/api/hooks/leads";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface EmailTaskDialogProps {
  task: TaskWithBucket;
  onClose: () => void;
}

export function EmailTaskDialog({ task, onClose }: EmailTaskDialogProps) {
  const isLeadTask = task.entityType === "LEAD" && !!task.entityId;
  const { data: lead } = useLeadDetail(isLeadTask ? task.entityId! : 0);

  const [to, setTo] = useState(lead?.email ?? "");
  const [subject, setSubject] = useState(`Follow-up: ${task.title}`);
  const [body, setBody] = useState("");
  const completeTask = useCompleteTask();

  const resolvedTo = to || lead?.email || "";

  function handleSend() {
    if (!resolvedTo.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    window.open(
      `mailto:${encodeURIComponent(resolvedTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank",
    );
    completeTask.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast.success("Email opened and task marked complete");
          onClose();
        },
        onError: () => toast.error("Failed to complete task"),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500" />
            Send Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {lead && (
            <p className="text-xs text-muted-foreground">
              Lead: <strong>{lead.name}</strong>
              {lead.company ? ` · ${lead.company}` : ""}
            </p>
          )}
          <div className="space-y-1">
            <Label>To *</Label>
            <Input
              type="email"
              value={resolvedTo}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here…"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Clicking Send will open your default mail client and mark this task as complete.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={completeTask.isPending || !resolvedTo.trim()}>
            <Mail className="h-4 w-4 mr-1" />
            {completeTask.isPending ? "Completing…" : "Send & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
