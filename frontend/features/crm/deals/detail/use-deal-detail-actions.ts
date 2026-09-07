"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDealMeetings,
  useCreateDealMeeting,
  useDeleteDealMeeting,
  useLogDealActivity,
} from "@/hooks/api/crm";

const buildFromDealContract = lazyContract(() =>
  import("zod").then((m) => m.z.object({ id: m.z.number().int() })),
);

interface MeetingSubmission {
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[];
  agenda?: string;
  notes?: string;
  actionItems?: string;
  recordingLink?: string;
}

interface ProjectSubmission {
  name: string;
  startDate?: string;
  endDate?: string;
}

interface PendingAction {
  type: "call" | "note" | "email" | "meeting";
  label: string;
}

export function useDealDetailActions(dealId: number) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const {
    data: meetings,
    isLoading: meetingsLoading,
    isError: meetingsError,
    refetch: refetchMeetings,
  } = useDealMeetings(dealId);
  const logActivity = useLogDealActivity();
  const createMeeting = useCreateDealMeeting(dealId);
  const deleteMeeting = useDeleteDealMeeting(dealId);

  const handleRetryMeetings = useCallback(() => {
    void refetchMeetings();
  }, [refetchMeetings]);

  const handleQuickActionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const raw = e.currentTarget.dataset.actionType;
      const label = e.currentTarget.dataset.actionLabel ?? "";
      if (
        raw === "call" ||
        raw === "note" ||
        raw === "email" ||
        raw === "meeting"
      ) {
        setPendingAction({ type: raw, label });
      }
    },
    [],
  );

  const handleLogActivity = useCallback(
    (notes: string) => {
      if (!pendingAction) return;
      logActivity.mutate(
        {
          dealId,
          type: pendingAction.type,
          subject: pendingAction.label,
          notes,
        },
        {
          onSuccess: () => {
            toast.success("Activity logged");
            setPendingAction(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [pendingAction, logActivity, dealId],
  );

  const handleCloseLogDialog = useCallback(() => setPendingAction(null), []);

  const handleCreateMeeting = useCallback(
    (data: MeetingSubmission) => {
      if (!data.title.trim() || !data.scheduledAt) {
        toast.error("Title and date are required");
        return;
      }
      createMeeting.mutate(data, {
        onSuccess: () => {
          toast.success("Meeting added");
          setMeetingDialogOpen(false);
        },
        onError: () => toast.error("Failed to add meeting"),
      });
    },
    [createMeeting],
  );

  const handleDeleteMeeting = useCallback(
    (meetingId: number) => {
      deleteMeeting.mutate(meetingId, {
        onSuccess: () => toast.success("Meeting removed"),
        onError: () => toast.error("Failed to remove meeting"),
      });
    },
    [deleteMeeting],
  );

  const handleCreateProject = useCallback(
    async (data: ProjectSubmission) => {
      if (!data.name.trim()) {
        toast.error("Project name is required");
        return;
      }
      setIsCreatingProject(true);
      try {
        const newProject = await apiClient.post<{ id: number }>(
          "/build/from-deal",
          {
            dealId,
            name: data.name.trim(),
            startDate: data.startDate,
            endDate: data.endDate,
          },
          undefined,
          buildFromDealContract,
        );
        toast.success("Project created successfully");
        setCreateProjectOpen(false);
        router.push(`/build/${newProject.id}`);
      } catch {
        toast.error("Failed to create project");
      } finally {
        setIsCreatingProject(false);
      }
    },
    [dealId, router],
  );

  const handleOpenMeetingDialog = useCallback(() => setMeetingDialogOpen(true), []);
  const handleOpenCreateProject = useCallback(() => setCreateProjectOpen(true), []);

  return {
    meetings,
    meetingsLoading,
    meetingsError,
    handleRetryMeetings,
    pendingAction,
    handleQuickActionClick,
    handleLogActivity,
    handleCloseLogDialog,
    isLoggingActivity: logActivity.isPending,
    meetingDialogOpen,
    setMeetingDialogOpen,
    handleOpenMeetingDialog,
    handleCreateMeeting,
    handleDeleteMeeting,
    isCreatingMeeting: createMeeting.isPending,
    createProjectOpen,
    setCreateProjectOpen,
    handleOpenCreateProject,
    handleCreateProject,
    isCreatingProject,
  };
}
