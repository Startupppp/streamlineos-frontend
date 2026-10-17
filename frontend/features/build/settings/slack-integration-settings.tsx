"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useSlackConnections,
  useCreateSlackConnection,
  useDeleteSlackConnection,
} from "@/hooks/api/slack-integration";
import type { SlackConnectionFormValues } from "./slack-connection-schema";
import { SlackConnectionRow } from "./slack-connection-row";
import { SlackAddConnectionDialog } from "./slack-add-connection-dialog";

export function SlackIntegrationSettings() {
  const canManage = useCan("integrations:slack:manage");
  const { data, isLoading, isError, refetch } = useSlackConnections();
  const createConnection = useCreateSlackConnection();
  const deleteConnection = useDeleteSlackConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleCreate = useCallback(
    (values: SlackConnectionFormValues) => {
      createConnection.mutate(
        {
          teamId: values.teamId.trim(),
          teamName: values.teamName?.trim() || undefined,
          signingSecret: values.signingSecret.trim(),
          botToken: values.botToken.trim(),
          defaultChannelId: values.defaultChannelId?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Slack connection created");
            setDialogOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createConnection],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteConnection.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Slack connection deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteConnection]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const connections = data?.data ?? [];

  return (
    <>
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-medium">Slack</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Receive ticket notifications and link Slack mentions to tickets.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" type="button" onClick={() => setDialogOpen(true)}>
            Add connection
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load Slack connections"
          description="There was a problem loading your Slack connections."
          onRetry={handleRetry}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No Slack workspace connected"
          description="Connect a Slack workspace to receive ticket notifications."
          action={canManage ? { label: "Add connection", onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <SlackConnectionRow
              key={connection.id}
              connection={connection}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <SlackAddConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isPending={createConnection.isPending}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Slack connection?"
        description="Ticket notifications to this workspace will stop. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
