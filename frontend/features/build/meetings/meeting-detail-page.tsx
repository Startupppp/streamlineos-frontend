"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useMeeting, useUpdateMeeting, useDeleteMeeting, useProjectMembers } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { UpdateMeetingInput } from "@/types/projects";

function DeleteMeetingButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs text-destructive hover:text-destructive"
      onClick={onClick}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} /> Delete
    </Button>
  );
}

interface MeetingDetailPageProps {
  projectId: number;
  meetingId: number;
}

export function MeetingDetailPage({ projectId, meetingId }: MeetingDetailPageProps) {
  const canManage = useCan("build:meetings:manage");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: meeting, isLoading, isError, error, refetch } = useMeeting(projectId, meetingId);
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

  const pageState = usePageState({ permission: "build:meetings:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Meeting" backHref={`/build/${projectId}/meetings`}>
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Meeting" backHref={`/build/${projectId}/meetings`}>
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

  if (!meeting) {
    return (
      <PageWrapper title="Meeting" backHref={`/build/${projectId}/meetings`}>
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
      backHref={`/build/${projectId}/meetings`}
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
            <Button variant="outline" onClick={handleOpenEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <DeleteMeetingButton onClick={handleOpenDelete} />
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this meeting?"
        description={`This will permanently delete "${meeting.title}" and all its action items and standup entries.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
