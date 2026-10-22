"use client";

import { useState } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useTicket,
  useSubtasks,
  useDeleteTicket,
} from "@/hooks/api/build/tickets";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { TICKET_TITLE_MAX } from "@/lib/validation/projects";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useTicketDetailProjectData } from "./use-ticket-detail-project-data";
import {
  useTicketSaveQueue,
  type TicketConflictState,
} from "./use-ticket-save-queue";

interface UseTicketDetailOptions {
  projectId: number;
  ticketId: number | null;
  onDeleted?: () => void;
}

export function useTicketDetail({
  projectId,
  ticketId,
  onDeleted,
}: UseTicketDetailOptions) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const canUpdate = useCan("build:tickets:update");

  const [conflict, setConflict] = useState<TicketConflictState | null>(null);

  const {
    data: ticket,
    isLoading,
    error: ticketError,
    refetch: refetchTicket,
    dataUpdatedAt: ticketUpdatedAt,
  } = useTicket(projectId, ticketId ?? 0, INLINE_READ_ERROR);
  const { projectData, members, statuses } =
    useTicketDetailProjectData(projectId);
  const { data: subtasks } = useSubtasks(ticketId ?? 0, projectId);

  const {
    saving,
    offlineDraftFields,
    enqueueSave,
    autoSave,
    debouncedSave,
    cancelPendingDebounce,
    lastSavedAtRef,
    lastSavedVersionRef,
  } = useTicketSaveQueue({
    ticketId,
    projectId,
    canUpdate,
    isOnline,
    queryClient,
    refetchTicket,
    members,
    onConflict: setConflict,
    ticketUpdatedAt: ticket?.updatedAt,
    ticketVersion: ticket?.version,
  });

  const titleVersion = ticket ? `${ticket.id}:${ticket.title}` : null;

  const [localTitle, setLocalTitle] = useSourceOverride(
    titleVersion,
    ticket?.title ?? "",
  );

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Ticket deleted");
      onDeleted?.();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function discardConflictingEdit() {
    setConflict(null);
  }

  function keepConflictingEdit() {
    if (!conflict) return;
    const { patch, serverUpdatedAt, serverVersion } = conflict;
    lastSavedAtRef.current = serverUpdatedAt;
    lastSavedVersionRef.current = serverVersion;
    setConflict(null);
    enqueueSave(patch);
  }

  function handleDelete() {
    if (!ticketId) return;
    deleteTicketMutation.mutate({ ticketId });
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setLocalTitle(e.target.value);
  }

  function commitTitle(nextTitle: string): string | null {
    const trimmed = nextTitle.trim();
    if (!trimmed) {
      return "Title is required";
    }
    if (trimmed.length > TICKET_TITLE_MAX) {
      return `Title must be at most ${TICKET_TITLE_MAX} characters`;
    }
    setLocalTitle(trimmed);
    if (trimmed !== (ticket?.title ?? "")) {
      autoSave({ title: trimmed });
    }
    return null;
  }

  function revertTitle() {
    cancelPendingDebounce();
    setLocalTitle(ticket?.title ?? "");
  }

  function handleDescriptionEditorChange(html: string) {
    if (html === (ticket?.description ?? "")) return;
    debouncedSave({ description: html });
  }

  return {
    ticket,
    isLoading,
    ticketError,
    refetchTicket,
    ticketUpdatedAt,
    offlineDraftFields,
    projectData,
    subtasks: subtasks ?? [],
    members,
    statuses,
    saving,
    conflict,
    keepConflictingEdit,
    discardConflictingEdit,
    localTitle,
    handleTitleChange,
    commitTitle,
    revertTitle,
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting: deleteTicketMutation.isPending,
  };
}
