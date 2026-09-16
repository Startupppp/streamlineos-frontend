"use client";

import { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon, SendIcon, ActivityIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrWebhooks,
  useToggleHrWebhook,
  useDeleteHrWebhook,
  useTestHrWebhook,
} from "@/hooks/api/hr/hr-webhooks";
import type { HrWebhookSubscription } from "@/types/hr/webhooks";
import { WebhookUpsertSheet } from "./webhook-upsert-sheet";
import { WebhookDeliveriesSheet } from "./webhook-deliveries-sheet";

function WebhookRow({
  sub,
  onEdit,
  onViewDeliveries,
}: {
  sub: HrWebhookSubscription;
  onEdit: (sub: HrWebhookSubscription) => void;
  onViewDeliveries: (sub: HrWebhookSubscription) => void;
}) {
  const toggle = useToggleHrWebhook();
  const remove = useDeleteHrWebhook();
  const test = useTestHrWebhook();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleToggle = useCallback(
    async (isActive: boolean) => {
      try {
        await toggle.mutateAsync({ webhookId: sub.id, isActive });
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [toggle, sub.id],
  );

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await remove.mutateAsync(sub.id);
      toast.success("Webhook deleted");
      setConfirmDeleteOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [remove, sub.id]);

  const handleTest = useCallback(async () => {
    try {
      const result = await test.mutateAsync(sub.id);
      toast.success(`Test sent for event: ${result.event}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [test, sub.id]);

  return (
    <div className="flex items-start gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors">
      <Switch
        checked={sub.isActive}
        onCheckedChange={handleToggle}
        disabled={toggle.isPending}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{sub.name}</span>
          <Badge variant="outline" className="text-dense font-mono font-normal">
            {sub.events.length} event{sub.events.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{sub.url}</p>
        <p className="text-dense text-muted-foreground">
          Created {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <TooltipIconButton
          icon={ActivityIcon}
          iconSize={14}
          label="View Deliveries"
          className="w-7"
          onClick={() => onViewDeliveries(sub)}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <LoadingButton
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label="Send Test Payload"
              isPending={test.isPending}
              onClick={handleTest}
            >
              <SendIcon size={14} />
            </LoadingButton>
          </TooltipTrigger>
          <TooltipContent>Send Test Payload</TooltipContent>
        </Tooltip>
        <TooltipIconButton
          label="Edit"
          className="w-7"
          onClick={() => onEdit(sub)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </TooltipIconButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <LoadingButton
              variant="ghost"
              size="icon"
              className="w-7 text-destructive hover:text-destructive"
              aria-label="Delete"
              isPending={remove.isPending}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2Icon size={14} />
            </LoadingButton>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Webhook"
        description={`Delete webhook "${sub.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        isPending={remove.isPending}
      />
    </div>
  );
}

export function WebhooksSection() {
  const { data: subscriptions, isLoading, isError, error, refetch } = useHrWebhooks();
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<HrWebhookSubscription | undefined>(undefined);
  const [deliveriesSub, setDeliveriesSub] = useState<HrWebhookSubscription | undefined>(undefined);

  const handleNew = useCallback(() => {
    setEditing(undefined);
    setUpsertOpen(true);
  }, []);

  const handleEdit = useCallback((sub: HrWebhookSubscription) => {
    setEditing(sub);
    setUpsertOpen(true);
  }, []);

  const handleUpsertClose = useCallback((open: boolean) => {
    setUpsertOpen(open);
    if (!open) setEditing(undefined);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Webhook Subscriptions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receive signed HTTPS payloads for HR events in real time.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5">
          <PlusIcon size={14} />
          Add Webhook
        </Button>
      </div>

      <div className="rounded-lg border divide-y-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load webhooks"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            compact
          />
        ) : !subscriptions || subscriptions.length === 0 ? (
          <EmptyState
            illustrationPreset="automations"
            title="No webhooks configured"
            description="Add a webhook to receive signed HTTPS payloads for HR events."
            action={{ label: "Add webhook", onClick: handleNew }}
            compact
          />
        ) : (
          subscriptions.map((sub) => (
            <WebhookRow
              key={sub.id}
              sub={sub}
              onEdit={handleEdit}
              onViewDeliveries={setDeliveriesSub}
            />
          ))
        )}
      </div>

      <div className="rounded-md border border-status-info-rule bg-status-info-surface p-3 text-xs text-status-info-ink">
        Payloads are signed with{" "}
        <code className="bg-status-info-surface px-1 rounded">HMAC-SHA256</code> — verify the{" "}
        <code className="bg-status-info-surface px-1 rounded">X-StreamlineOS-Signature</code> header.
        Failed deliveries are retried up to 5 times with exponential backoff.
      </div>

      <WebhookUpsertSheet
        open={upsertOpen}
        onOpenChange={handleUpsertClose}
        subscription={editing}
      />

      {deliveriesSub && (
        <WebhookDeliveriesSheet
          open={!!deliveriesSub}
          onOpenChange={(open) => { if (!open) setDeliveriesSub(undefined); }}
          subscription={deliveriesSub}
        />
      )}
    </div>
  );
}
