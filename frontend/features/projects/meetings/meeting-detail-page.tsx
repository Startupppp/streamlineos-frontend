"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useMeeting, useUpdateMeeting, useDeleteMeeting, useProjectMembers } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MeetingTypeBadge, MeetingStatusBadge } from "./meeting-badges";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { MeetingNotesSection } from "./meeting-notes-section";
import { AttendeesSection } from "./attendees-section";
import { ActionItemsSection } from "./action-items-section";
import { StandupPanel } from "./standup-panel";
import { getErrorMessage } from "@/lib/get-error-message";
import type { UpdateMeetingInput } from "@/types/projects";

interface MeetingDetailPageProps {
  projectId: number;
  meetingId: number;
}

export function MeetingDetailPage({ projectId, meetingId }: MeetingDetailPageProps) {
  const canManage = useCan("projects:meetings:manage");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: meeting, isLoading, isError, refetch } = useMeeting(projectId, meetingId);
  const { data: projectMembers = [] } = useProjectMembers(projectId);

  const updateMeeting = useUpdateMeeting(projectId);
  const deleteMeeting = useDeleteMeeting(projectId);

  function handleUpdate(input: UpdateMeetingInput) {
    updateMeeting.mutate(input, {
      onSuccess: () => { toast.success("Meeting updated"); setEditOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deleteMeeting.mutate(meetingId, {
      onSuccess: () => {
        toast.success("Meeting deleted");
        setDeleteOpen(false);
        if (typeof window !== "undefined") {
          window.history.back();
        }
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  if (isLoading) {
    return (
      <PageWrapper title="Meeting" eyebrow="Project" backHref={`/projects/${projectId}/meetings`}>
        <div className="px-4 pb-4 space-y-6">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !meeting) {
    return (
      <PageWrapper title="Meeting" eyebrow="Project" backHref={`/projects/${projectId}/meetings`}>
        <div className="px-4 pb-4">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      </PageWrapper>
    );
  }

  const scheduledLabel = meeting.scheduledAt
    ? new Date(meeting.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <PageWrapper
      title={meeting.title}
      eyebrow={`MTG-${meeting.meetingNumber}`}
      backHref={`/projects/${projectId}/meetings`}
      badge={
        <div className="flex items-center gap-1.5">
          <MeetingTypeBadge type={meeting.type} />
          <MeetingStatusBadge status={meeting.status} />
        </div>
      }
      subtitle={scheduledLabel ?? undefined}
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:text-destructive gap-1.5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="px-4 pb-8 space-y-8">
        <MeetingNotesSection meeting={meeting} projectId={projectId} canManage={canManage} />

        <div className="border-t pt-6">
          <AttendeesSection
            projectId={projectId}
            meetingId={meetingId}
            attendees={meeting.attendees}
            projectMembers={projectMembers}
            canManage={canManage}
          />
        </div>

        <div className="border-t pt-6">
          <ActionItemsSection
            projectId={projectId}
            meetingId={meetingId}
            actionItems={meeting.actionItems}
            projectMembers={projectMembers}
            canManage={canManage}
          />
        </div>

        {meeting.type === "standup" && (
          <div className="border-t pt-6">
            <StandupPanel
              projectId={projectId}
              meetingId={meetingId}
              standupEntries={meeting.standupEntries}
              attendees={meeting.attendees}
              projectMembers={projectMembers}
            />
          </div>
        )}
      </div>

      <MeetingFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={meeting}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleUpdate}
        isPending={updateMeeting.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{meeting.title}&quot; and all its action items and standup entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
