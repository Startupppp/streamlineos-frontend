"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProject,
  useSprints,
  useSubtasks,
} from "@/hooks/api";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProjectMember } from "./types";

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

export function useTicketDetail({ projectId, ticketId, onDeleted }: UseTicketDetailOptions) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [syncedTitleId, setSyncedTitleId] = useState<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAtRef = useRef<string | undefined>(undefined);

  const {
    data: ticket,
    isLoading,
    error: ticketError,
  } = useTicket(projectId, ticketId ?? 0);
  const { data: projectData } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const { data: subtasks } = useSubtasks(ticketId ?? 0, projectId);

  const members = useMemo<ProjectMember[]>(() => {
    if (!projectData?.members) return [];
    const list = projectData.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name || `${m.user!.firstName || ""} ${m.user!.lastName || ""}`.trim(),
        firstName: m.user!.firstName || undefined,
        lastName: m.user!.lastName || undefined,
        image: m.user!.image || null,
        email: m.user!.email || "",
      }));
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

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: buildWorkQueryKeys.projects.detail(projectId),
      refetchType: "none",
    });
    if (ticketId !== null) {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId) });
    }
  }, [queryClient, projectId, ticketId]);

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: (data) => {
      lastSavedAtRef.current = data.updatedAt;
      setSaving(false);
      invalidateAll();
    },
    onError: (error) => {
      setSaving(false);
      if (isApiError(error) && getApiErrorCode(error) === "PROJECTS_TICKET_CONFLICT") {
        toast.warning("This ticket was changed elsewhere — refreshed with the latest version.");
        if (ticketId !== null) {
          queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(ticketId) });
        }
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Ticket deleted");
      invalidateAll();
      onDeleted?.();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (ticket?.updatedAt) {
      lastSavedAtRef.current = new Date(ticket.updatedAt).toISOString();
    }
  }, [ticket?.updatedAt]);

  const autoSave = useCallback(
    (field: Record<string, unknown>) => {
      if (!ticketId) return;
      setSaving(true);
      updateTicketMutation.mutate({ ticketId, expectedUpdatedAt: lastSavedAtRef.current, ...field });
    },
    [ticketId, updateTicketMutation],
  );

  const debouncedSave = useCallback(
    (field: Record<string, unknown>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaving(true);
      debounceTimerRef.current = setTimeout(() => {
        if (!ticketId) return;
        updateTicketMutation.mutate({ ticketId, expectedUpdatedAt: lastSavedAtRef.current, ...field });
      }, 500);
    },
    [ticketId, updateTicketMutation],
  );

  if (ticket && ticket.id !== syncedTitleId) {
    setSyncedTitleId(ticket.id);
    setLocalTitle(ticket.title);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

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
    projectData,
    sprints: sprints ?? [],
    subtasks: subtasks ?? [],
    members,
    statuses,
    saving,
    localTitle,
    handleTitleChange,
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting: deleteTicketMutation.isPending,
  };
}
