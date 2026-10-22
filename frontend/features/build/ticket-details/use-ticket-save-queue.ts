"use client";

import { useState, useRef, useEffect, useEffectEvent } from "react";
import { toast } from "sonner";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { getErrorMessage } from "@/lib/get-error-message";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { isApiError, getApiErrorCode } from "@/lib/api-envelope";
import {
  diffTicketConflictFields,
  type TicketConflictFieldDiff,
} from "./ticket-conflict-diff";
import type { QueryClient } from "@tanstack/react-query";
import type { Ticket } from "@/types/projects";
import type { ProjectMember } from "./types";

export interface TicketConflictState {
  fields: TicketConflictFieldDiff[];
  patch: Record<string, unknown>;
  serverUpdatedAt: string;
  serverVersion: number | undefined;
}

interface UseTicketSaveQueueInput {
  ticketId: number | null;
  projectId: number;
  canUpdate: boolean;
  isOnline: boolean;
  queryClient: QueryClient;
  refetchTicket: () => Promise<{ data?: Ticket | null; error: unknown }>;
  members: ProjectMember[];
  onConflict: (state: TicketConflictState) => void;
  ticketUpdatedAt: string | Date | null | undefined;
  ticketVersion: number | undefined;
}

export function useTicketSaveQueue({
  ticketId,
  projectId,
  canUpdate,
  isOnline,
  queryClient,
  refetchTicket,
  members,
  onConflict,
  ticketUpdatedAt,
  ticketVersion,
}: UseTicketSaveQueueInput) {
  const [saving, setSaving] = useState(false);
  const [offlineDraftFields, setOfflineDraftFields] = useState<string[]>([]);

  const saveSequenceRef = useRef(0);
  const offlineDraftRef = useRef<Record<string, unknown>>({});
  const enqueueSaveRef = useRef<
    ((field: Record<string, unknown>) => void) | null
  >(null);
  const lastSavedAtRef = useRef<string | undefined>(undefined);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedVersionRef = useRef<number | undefined>(undefined);
  const pendingSaveRef = useRef<Record<string, unknown> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: (data) => {
      lastSavedAtRef.current = data.updatedAt;
      lastSavedVersionRef.current = data.version;
    },
    onError: (error, variables) => {
      if (
        isApiError(error) &&
        getApiErrorCode(error) === "PROJECTS_TICKET_CONFLICT"
      ) {
        if (ticketId !== null) {
          void queryClient.invalidateQueries({
            queryKey: buildWorkQueryKeys.projects.ticket(projectId, ticketId),
          });
        }
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(variables)) {
          if (
            key !== "ticketId" &&
            key !== "expectedUpdatedAt" &&
            key !== "version"
          ) {
            patch[key] = value;
          }
        }
        async function showFieldComparison() {
          const latest = await refetchTicket();
          const current = latest.data;
          if (!current?.updatedAt) return;
          const fields = diffTicketConflictFields(patch, current, {
            members,
            epics: queryClient.getQueryData(
              buildWorkQueryKeys.projects.epics(projectId),
            ),
            modules: queryClient.getQueryData(
              buildWorkQueryKeys.projects.modules(projectId),
            ),
            cycles: queryClient.getQueryData(
              buildWorkQueryKeys.projects.cycles(projectId),
            ),
          });
          if (fields.length === 0) return;
          onConflict({
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
          lastSavedAtRef.current = new Date(
            latest.data.updatedAt,
          ).toISOString();
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
      if (
        !isApiError(error) ||
        error.status === 0 ||
        (error.status !== undefined && error.status >= 500)
      ) {
        toast.warning(
          "This save may have succeeded. Check the ticket before retrying.",
        );
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (ticketUpdatedAt) {
      lastSavedAtRef.current = new Date(ticketUpdatedAt).toISOString();
    }
  }, [ticketUpdatedAt]);

  useEffect(() => {
    if (typeof ticketVersion === "number") {
      lastSavedVersionRef.current = ticketVersion;
    }
  }, [ticketVersion]);

  function enqueueSave(field: Record<string, unknown>) {
    if (!ticketId || !canUpdate) return;
    if (!isOnline) {
      offlineDraftRef.current = { ...offlineDraftRef.current, ...field };
      setOfflineDraftFields(Object.keys(offlineDraftRef.current));
      return;
    }
    const sequence = ++saveSequenceRef.current;
    setSaving(true);
    const task = saveQueueRef.current.then(() => {
      const cached = queryClient.getQueryData<{ version?: number }>(
        buildWorkQueryKeys.projects.ticket(projectId, ticketId),
      );
      const version = lastSavedVersionRef.current ?? cached?.version;
      if (version === undefined) {
        toast.error("Could not save — reload the ticket and try again.");
        return undefined;
      }
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
  }

  useEffect(() => {
    enqueueSaveRef.current = enqueueSave;
  });

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

  function autoSave(field: Record<string, unknown>) {
    enqueueSave(field);
  }

  function debouncedSave(field: Record<string, unknown>) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    pendingSaveRef.current = field;
    setSaving(true);
    debounceTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      enqueueSave(field);
    }, 500);
  }

  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingSaveRef.current = null;
      if (pending) enqueueSaveRef.current?.(pending);
    };
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (pendingSaveRef.current !== null) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handlePageHide() {
      const pending = pendingSaveRef.current;
      if (pending !== null && debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        pendingSaveRef.current = null;
        enqueueSaveRef.current?.(pending);
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  function cancelPendingDebounce() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      pendingSaveRef.current = null;
      setSaving(false);
    }
  }

  return {
    saving,
    offlineDraftFields,
    enqueueSave,
    enqueueSaveRef,
    autoSave,
    debouncedSave,
    cancelPendingDebounce,
    lastSavedAtRef,
    lastSavedVersionRef,
  };
}
