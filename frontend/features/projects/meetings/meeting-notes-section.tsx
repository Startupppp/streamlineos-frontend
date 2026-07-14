"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUpdateMeeting } from "@/hooks/api/projects";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import type { MeetingDetail } from "@/types/projects";

interface MeetingNotesSectionProps {
  meeting: MeetingDetail;
  projectId: number;
  canManage: boolean;
}

export function MeetingNotesSection({ meeting, projectId, canManage }: MeetingNotesSectionProps) {
  const [notesDraft, setNotesDraft] = useState<string>(meeting.notes ?? "");
  const [agendaDraft, setAgendaDraft] = useState<string>(meeting.agenda ?? "");
  const [dirty, setDirty] = useState(false);

  const updateMeeting = useUpdateMeeting(projectId);

  function handleAgendaChange(html: string) {
    setAgendaDraft(html);
    setDirty(true);
  }

  function handleNotesChange(html: string) {
    setNotesDraft(html);
    setDirty(true);
  }

  function handleSave() {
    updateMeeting.mutate(
      { id: meeting.id, agenda: agendaDraft || null, notes: notesDraft || null },
      {
        onSuccess: () => { toast.success("Notes saved"); setDirty(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
        <div className={cn(PM_PANEL, "overflow-hidden")}>
          <TiptapEditor
            content={meeting.agenda ?? ""}
            output="html"
            onChangeHtml={canManage ? handleAgendaChange : undefined}
            editable={canManage}
            placeholder="Add meeting agenda…"
            minHeightClassName="min-h-[100px]"
            contentKey={`agenda-${meeting.id}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          {canManage && dirty ? (
            <LoadingButton size="sm" className="h-7 text-xs" onClick={handleSave} isPending={updateMeeting.isPending} loadingText="Saving…">
              Save Notes
            </LoadingButton>
          ) : null}
        </div>
        <div className={cn(PM_PANEL, "overflow-hidden")}>
          <TiptapEditor
            content={meeting.notes ?? ""}
            output="html"
            onChangeHtml={canManage ? handleNotesChange : undefined}
            editable={canManage}
            placeholder="Capture meeting notes…"
            minHeightClassName="min-h-[140px]"
            contentKey={`notes-${meeting.id}`}
          />
        </div>
        {canManage && !dirty ? (
          <p className="text-xs text-muted-foreground">Notes are auto-saved when you click Save Notes.</p>
        ) : null}
      </div>
    </div>
  );
}
