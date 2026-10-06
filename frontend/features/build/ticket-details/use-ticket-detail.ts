"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useSubtasks,
} from "@/hooks/api/build/tickets";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { isApiError, getApiErrorCode } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  diffTicketConflictFields,
  type TicketConflictFieldDiff,
} from "./ticket-conflict-diff";
import { useTicketDetailProjectData } from "./use-ticket-detail-project-data";

interface UseTicketDetailOptions {
  projectId: number;
  ticketId: number | null;
  onDeleted?: () => void;
}

interface TicketConflictState {
  fields: TicketConflictFieldDiff[];
  patch: Record<string, unknown>;
  serverUpdatedAt: string;
  serverVersion: number | undefined;
}

export function useTicketDetail({ projectId, ticketId, onDeleted }: UseTicketDetailOptions) {
  const canUpdate = useCan("build:tickets:update");
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [saving, setSaving] = useState(false);
  const [offlineDraftFields, setOfflineDraftFields] = useState<string[]>([]);
  const offlineDraftRef = useRef<Record<string, unknown>>({});
  const [conflict, setConflict] = useState<TicketConflictState | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAtRef = useRef<string | undefined>(undefined);
  const lastSavedVersionRef = useRef<number | undefined>(undefined);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveSequenceRef = useRef(0);
  const enqueueSaveRef = useRef<
    ((field: Record<string, unknown>) => void) | null
  >(null);

  const {
    data: ticket,
    isLoading,
    error: ticketError,
    refetch: refetchTicket,
    dataUpdatedAt: ticketUpdatedAt,
  } = useTicket(projectId, ticketId ?? 0, INLINE_READ_ERROR);
  const { projectData, members, statuses } = useTicketDetailProjectData(projectId);
  const { data: subtasks } = useSubtasks(ticketId ?? 0, projectId);

  const titleVersion = ticket ? `${ticket.id}:${ticket.title}` : null;
  const [localTitle, setLocalTitle] = useSourceOverride(titleVersion, ticket?.title ?? "");

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: (data) => {
      lastSavedAtRef.current = data.updatedAt;
      lastSavedVersionRef.current = data.version;
    },
    onError: (error, variables) => {
      if (isApiError(error) && getApiErrorCode(error) === "PROJECTS_TICKET_CONFLICT") {
        if (ticketId !== null) {
          void queryClient.invalidateQueries({
            queryKey: buildWorkQueryKeys.projects.ticket(projectId, ticketId),
          });
        }
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(variables)) {
          if (key !== "ticketId" && key !== "expectedUpdatedAt" && key !== "version") {
            patch[key] = value;
          }
        }
        async function showFieldComparison() {
          const latest = await refetchTicket();
          const current = latest.data;
          if (!current?.updatedAt) return;
          const fields = diffTicketConflictFields(patch, current, {
            members,
            epics: queryClient.getQueryData(buildWorkQueryKeys.projects.epics(projectId)),
            modules: queryClient.getQueryData(buildWorkQueryKeys.projects.modules(projectId)),
            cycles: queryClient.getQueryData(buildWorkQueryKeys.projects.cycles(projectId)),
          });
          if (fields.length === 0) return;
          setConflict({
            fields,
            patch,
            serverUpdatedAt: new Date(current.updatedAt).toISOString(),
            serverVersion: current.version,
          });
        }
        void showFieldComparison();
        async function handleReapply() {
          const latest = await refetchTicket();
          if (!latest.data?.updatedAt) {
            toast.error(
              latest.error
                ? getErrorMessage(latest.error)
                : "The latest ticket could not be loaded. Try again.",
            );
            return;
          }
          lastSavedAtRef.current = new Date(latest.data.updatedAt).toISOString();
          lastSavedVersionRef.current = latest.data.version;
          enqueueSaveRef.current?.(patch);
        }
        toast.warning(
          "This ticket changed elsewhere. Your edit was not saved — the latest version is shown.",
          {
            action: {
              label: "Reapply",
              onClick: handleReapply,
            },
          },
        );
        return;
      }
      if (!isApiError(error) || error.status === 0 || (error.status !== undefined && error.status >= 500)) {
        toast.warning("This save may have succeeded. Check the ticket before retrying.");
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Ticket deleted");
      onDeleted?.();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (ticket?.updatedAt) {
      lastSavedAtRef.current = new Date(ticket.updatedAt).toISOString();
    }
  }, [ticket?.updatedAt]);

  useEffect(() => {
    if (typeof ticket?.version === "number") {
      lastSavedVersionRef.current = ticket.version;
    }
  }, [ticket?.version]);

  const enqueueSave = useCallback(
    (field: Record<string, unknown>) => {
      if (!ticketId || !canUpdate) return;
      if (!isOnline) {
        offlineDraftRef.current = { ...offlineDraftRef.current, ...field };
        setOfflineDraftFields(Object.keys(offlineDraftRef.current));
        return;
      }
      const sequence = ++saveSequenceRef.current;
      setSaving(true);
      const task = saveQueueRef.current.then(() => {
        const version = lastSavedVersionRef.current;
        if (version === undefined) return undefined;
        return updateTicketMutation.mutateAsync({
          ticketId,
          expectedUpdatedAt: lastSavedAtRef.current,
          version,
          ...field,
        });
      });
      saveQueueRef.current = task.then(
        () => undefined,
        () => undefined,
      );
      void task
        .finally(() => {
          if (sequence === saveSequenceRef.current) setSaving(false);
        })
        .catch(() => undefined);
    },
    [ticketId, canUpdate, isOnline, updateTicketMutation],
  );

  useEffect(() => {
    enqueueSaveRef.current = enqueueSave;
  }, [enqueueSave]);

  const flushOfflineDrafts = useEffectEvent(() => {
    const pending = offlineDraftRef.current;
    if (Object.keys(pending).length === 0) return;
    offlineDraftRef.current = {};
    setOfflineDraftFields([]);
    enqueueSave(pending);
  });

  useEffect(() => {
    if (isOnline) flushOfflineDrafts();
  }, [isOnline]);

  const autoSave = useCallback(
    (field: Record<string, unknown>) => {
      enqueueSave(field);
    },
    [enqueueSave],
  );

  const debouncedSave = useCallback(
    (field: Record<string, unknown>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaving(true);
      debounceTimerRef.current = setTimeout(() => {
        enqueueSave(field);
      }, 500);
    },
    [enqueueSave],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const discardConflictingEdit = useCallback(() => {
    setConflict(null);
  }, []);

  const keepConflictingEdit = useCallback(() => {
    if (!conflict) return;
    const { patch, serverUpdatedAt, serverVersion } = conflict;
    lastSavedAtRef.current = serverUpdatedAt;
    lastSavedVersionRef.current = serverVersion;
    setConflict(null);
    enqueueSave(patch);
  }, [conflict, enqueueSave]);

  const handleDelete = useCallback(() => {
    if (!ticketId) return;
    deleteTicketMutation.mutate({ ticketId });
  }, [deleteTicketMutation, ticketId]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalTitle(e.target.value);
    },
    [setLocalTitle],
  );

  const commitTitle = useCallback(
    (nextTitle: string): string | null => {
      const trimmed = nextTitle.trim();
      if (!trimmed) {
        return "Title is required";
      }
      setLocalTitle(trimmed);
      if (trimmed !== (ticket?.title ?? "")) {
        debouncedSave({ title: trimmed });
      }
      return null;
    },
    [debouncedSave, setLocalTitle, ticket?.title],
  );

  const revertTitle = useCallback(() => {
    setLocalTitle(ticket?.title ?? "");
  }, [setLocalTitle, ticket?.title]);

  const handleDescriptionEditorChange = useCallback(
    (html: string) => {
      if (html === (ticket?.description ?? "")) return;
      debouncedSave({ description: html });
    },
    [debouncedSave, ticket?.description],
  );

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
