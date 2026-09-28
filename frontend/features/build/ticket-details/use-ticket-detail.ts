"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useSubtasks,
} from "@/hooks/api/build/tickets";
import { useProject } from "@/hooks/api/build/projects";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { ProjectMember } from "./types";
import { useCan } from "@/hooks/api/access";
import {
  diffTicketConflictFields,
  type TicketConflictFieldDiff,
} from "./ticket-conflict-diff";

interface ProjectManager {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  email?: string | null;
}

function isProjectWithManager(data: unknown): data is { manager?: ProjectManager } {
  return typeof data === "object" && data !== null && "manager" in data;
}

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
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<TicketConflictState | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [syncedTitleVersion, setSyncedTitleVersion] = useState<string | null>(null);
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
  } = useTicket(projectId, ticketId ?? 0, INLINE_READ_ERROR);
  const { data: projectData } = useProject(projectId);
  const { data: subtasks } = useSubtasks(ticketId ?? 0, projectId);

  const members = useMemo<ProjectMember[]>(() => {
    if (!projectData?.members) return [];
    const list = projectData.members.flatMap((m) => {
      const user = m.user;
      if (!user) return [];
      return [
        {
          id: user.id,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          image: user.image || null,
          email: user.email || "",
        },
      ];
    });
    const mgr = isProjectWithManager(projectData) ? projectData.manager : undefined;
    if (mgr && !list.some((m) => m.id === mgr.id)) {
      list.unshift({
        id: mgr.id,
        name: mgr.name || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
        firstName: mgr.firstName || undefined,
        lastName: mgr.lastName || undefined,
        image: mgr.image || null,
        email: mgr.email || "",
      });
    }
    return list;
  }, [projectData]);

  const statuses = useMemo(() => {
    if (!projectData || !("statuses" in projectData)) return undefined;
    return (projectData.statuses as { id: number; name: string }[]).map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }, [projectData]);

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
    [ticketId, canUpdate, updateTicketMutation],
  );

  useEffect(() => {
    enqueueSaveRef.current = enqueueSave;
  }, [enqueueSave]);

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

  const titleVersion = ticket ? `${ticket.id}:${ticket.updatedAt}:${ticket.title}` : null;
  if (ticket && syncedTitleVersion !== titleVersion) {
    setSyncedTitleVersion(titleVersion);
    setLocalTitle(ticket.title);
  }

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
      debouncedSave({ title: e.target.value });
    },
    [debouncedSave],
  );

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
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting: deleteTicketMutation.isPending,
  };
}
