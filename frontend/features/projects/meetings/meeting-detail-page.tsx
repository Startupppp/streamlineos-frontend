"use client";

import { useCallback, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
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

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Meeting" eyebrow="Project" backHref={`/projects/${projectId}/meetings`}>
        <PmPageShell>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className={cn("h-32 w-full rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-40 w-full rounded-xl", PM_PANEL)} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError || !meeting) {
    return (
      <PageWrapper title="Meeting" eyebrow="Project" backHref={`/projects/${projectId}/meetings`}>
        <PmPageShell withGlow={false}>
          <ErrorState onRetry={handleRetry} />
        </PmPageShell>
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
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleOpenEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleOpenDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <p className={cn(TEXT_ONE_LINE, "sr-only")}>{meeting.title}</p>
          <PmPanel className="p-3 sm:p-4">
            <MeetingNotesSection meeting={meeting} projectId={projectId} canManage={canManage} />
          </PmPanel>
        </PmSection>

        <PmSection index={1}>
          <PmPanel className="p-3 sm:p-4">
            <AttendeesSection
              projectId={projectId}
              meetingId={meetingId}
              attendees={meeting.attendees}
              projectMembers={projectMembers}
              canManage={canManage}
            />
          </PmPanel>
        </PmSection>

        <PmSection index={2}>
          <PmPanel className="p-3 sm:p-4">
            <ActionItemsSection
              projectId={projectId}
              meetingId={meetingId}
              actionItems={meeting.actionItems}
              projectMembers={projectMembers}
              canManage={canManage}
            />
          </PmPanel>
        </PmSection>

        {meeting.type === "standup" ? (
          <PmSection index={3}>
            <PmPanel className="p-3 sm:p-4">
              <StandupPanel
                projectId={projectId}
                meetingId={meetingId}
                standupEntries={meeting.standupEntries}
                attendees={meeting.attendees}
                projectMembers={projectMembers}
              />
            </PmPanel>
          </PmSection>
        ) : null}
      </PmPageShell>

      <MeetingFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={meeting}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleUpdate}
        isPending={updateMeeting.isPending}
        projectMembers={projectMembers}
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
