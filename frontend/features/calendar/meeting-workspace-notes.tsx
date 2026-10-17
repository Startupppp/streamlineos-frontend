"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import { useAddCalendarMeetingNote } from "@/hooks/api/calendar-meeting-workspace";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function MeetingWorkspaceNotes({ workspace }: { workspace: CalendarMeetingWorkspace }) {
  const [content, setContent] = useState("");
  const [share, setShare] = useState(false);
  const add = useAddCalendarMeetingNote();

  const handleAdd = () => {
    if (!content.trim()) return;
    add.mutate({ workspaceId: workspace.id, kind: "NOTE", content: content.trim(), sharedWithGuests: share }, {
      onSuccess: () => {
        setContent("");
        setShare(false);
        toast.success("Meeting note saved");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg bg-muted p-3 dark:border dark:border-background">
        <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Capture discussion, evidence, or an agreed decision" aria-label="Meeting note" className="min-h-24" />
        <div className="flex items-center justify-between gap-3">
          <Label className="font-normal"><Checkbox checked={share} onCheckedChange={(value) => setShare(value === true)} />Share with guests</Label>
          <Button size="sm" onClick={handleAdd} disabled={add.isPending || !content.trim()}><FileText className="size-4" />Save note</Button>
        </div>
      </div>
      <div className="space-y-2">
        {workspace.notes.length === 0 ? <p className="text-xs text-muted-foreground">No retained notes yet.</p> : null}
        {workspace.notes.map((note) => (
          <article key={note.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">{note.kind}</p><p className="text-micro text-muted-foreground">{note.sharedWithGuests ? "Shared with guests" : "Internal"}</p></div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
