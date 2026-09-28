"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDeleteWebhook,
  useUpdateWebhook,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";
import {
  diffWebhookConflictFields,
  type WebhookConflictField,
  type WebhookConflictPatch,
} from "@/features/build/webhooks/webhook-conflict-dialog";

interface UseWebhookListCommandsOptions {
  projectId: number;
  webhookList: ProjectWebhook[];
  refetch: () => void;
  resetKey: string;
}

export function useWebhookListCommands({
  projectId,
  webhookList,
  refetch,
  resetKey,
}: UseWebhookListCommandsOptions) {
  const updateWebhook = useUpdateWebhook(projectId);
  const deleteWebhook = useDeleteWebhook(projectId);

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [bulkPending, setBulkPending] = useState(false);
  const [conflict, setConflict] = useState<{
    webhookId: number;
    patch: WebhookConflictPatch;
  } | null>(null);

  const [appliedResetKey, setAppliedResetKey] = useState(resetKey);

  if (appliedResetKey !== resetKey) {
    setAppliedResetKey(resetKey);
    if (selectedIds.size > 0) setSelectedIds(new Set<number>());
  }

  const handleMutationError = useCallback(
    (error: unknown, webhookId: number, patch: WebhookConflictPatch) => {
      if (isApiError(error) && error.status === 409) {
        setConflict({ webhookId, patch });
        refetch();
        return;
      }
      toast.error(getErrorMessage(error));
    },
    [refetch],
  );

  const handleDelete = useCallback(
    (webhookId: number) => {
      deleteWebhook.mutate(webhookId, {
        onSuccess: () => toast.success("Webhook deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteWebhook],
  );

  const handleToggle = useCallback(
    (webhook: Pick<ProjectWebhook, "id" | "version">, isActive: boolean) => {
      updateWebhook.mutate(
        { webhookId: webhook.id, version: webhook.version, isActive },
        {
          onSuccess: () =>
            toast.success(isActive ? "Webhook enabled" : "Webhook disabled"),
          onError: (e) => handleMutationError(e, webhook.id, { isActive }),
        },
      );
    },
    [updateWebhook, handleMutationError],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set<number>());
  }, []);

  const handleSelectedChange = useCallback(
    (webhookId: number, selected: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(webhookId);
        } else {
          next.delete(webhookId);
        }
        return next;
      });
    },
    [],
  );

  const selectedWebhooks = useMemo(
    () => webhookList.filter((wh) => selectedIds.has(wh.id)),
    [webhookList, selectedIds],
  );

  const reportBulkOutcome = useCallback(
    (
      verb: string,
      results: PromiseSettledResult<unknown>[],
      rows: ProjectWebhook[],
    ) => {
      const failed = rows.filter((_, i) => results[i]?.status === "rejected");
      const succeeded = rows.length - failed.length;
      if (failed.length === 0) {
        toast.success(`${succeeded} webhook${succeeded === 1 ? "" : "s"} ${verb}`);
        return;
      }
      toast.error(
        `${succeeded} of ${rows.length} ${verb}. Failed: ${failed
          .map((row) => row.url)
          .join(", ")}`,
      );
    },
    [],
  );

  const handleBulkActive = useCallback(
    (isActive: boolean) => {
      const rows = selectedWebhooks;
      if (rows.length === 0) return;
      setBulkPending(true);
      void Promise.allSettled(
        rows.map((row) =>
          updateWebhook.mutateAsync({
            webhookId: row.id,
            version: row.version,
            isActive,
          }),
        ),
      ).then((results) => {
        setBulkPending(false);
        setSelectedIds(new Set<number>());
        reportBulkOutcome(isActive ? "enabled" : "disabled", results, rows);
      });
    },
    [selectedWebhooks, updateWebhook, reportBulkOutcome],
  );

  const handleBulkEnable = useCallback(
    () => handleBulkActive(true),
    [handleBulkActive],
  );

  const handleBulkDisable = useCallback(
    () => handleBulkActive(false),
    [handleBulkActive],
  );

  const handleBulkDelete = useCallback(() => {
    const rows = selectedWebhooks;
    if (rows.length === 0) return;
    setBulkPending(true);
    void Promise.allSettled(
      rows.map((row) => deleteWebhook.mutateAsync(row.id)),
    ).then((results) => {
      setBulkPending(false);
      setSelectedIds(new Set<number>());
      reportBulkOutcome("deleted", results, rows);
    });
  }, [selectedWebhooks, deleteWebhook, reportBulkOutcome]);

  const conflictServerWebhook =
    conflict === null
      ? undefined
      : webhookList.find((wh) => wh.id === conflict.webhookId);

  const conflictFields: WebhookConflictField[] =
    conflict === null || conflictServerWebhook === undefined
      ? []
      : diffWebhookConflictFields(conflict.patch, conflictServerWebhook);

  const handleConflictDiscard = useCallback(() => setConflict(null), []);

  const handleConflictKeepMine = useCallback(() => {
    if (conflict === null || conflictServerWebhook === undefined) {
      setConflict(null);
      return;
    }
    const { webhookId, patch } = conflict;
    updateWebhook.mutate(
      { webhookId, version: conflictServerWebhook.version, ...patch },
      {
        onSuccess: () => {
          setConflict(null);
          toast.success("Webhook updated");
        },
        onError: (e) => handleMutationError(e, webhookId, patch),
      },
    );
  }, [conflict, conflictServerWebhook, updateWebhook, handleMutationError]);

  return {
    updateWebhook,
    selectedIds,
    selectedWebhooks,
    bulkPending,
    conflictOpen: conflict !== null,
    conflictFields,
    handleMutationError,
    handleDelete,
    handleToggle,
    clearSelection,
    handleSelectedChange,
    handleBulkEnable,
    handleBulkDisable,
    handleBulkDelete,
    handleConflictDiscard,
    handleConflictKeepMine,
  };
}
