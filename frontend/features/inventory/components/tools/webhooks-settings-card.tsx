"use client";

import { memo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useWebhooks,
  useDeleteWebhook,
  useWebhookEvents,
  useRetryWebhookEvent,
  type Webhook,
} from "@/hooks/api/inventory/webhooks";
import { WebhookCreateSheet } from "./webhook-create-sheet";
import { WebhookDeliveryLog } from "./webhook-delivery-log";

const WebhookActionCell = memo(function WebhookActionCell({
  webhook,
  onEdit,
  onDelete,
  canManage,
}: {
  webhook: Webhook;
  onEdit: (wh: Webhook) => void;
  onDelete: (id: number) => void;
  canManage: boolean;
}) {
  function handleEdit(e: React.MouseEvent): void {
    e.stopPropagation();
    onEdit(webhook);
  }
  function handleDelete(e: React.MouseEvent): void {
    e.stopPropagation();
    onDelete(webhook.id);
  }
  if (!canManage) return null;
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleEdit}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={handleDelete}>
        Del
      </Button>
    </div>
  );
});

export function WebhooksSettingsCard() {
  const canManage = useCan("inventory:webhooks:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);

  const { data: webhooks, isLoading } = useWebhooks();
  const deleteMut = useDeleteWebhook();
  const retryMut = useRetryWebhookEvent();
  const eventsQuery = useWebhookEvents(selectedWebhookId ?? 0, { limit: 10 });

  function handleOpenCreate(): void {
    setEditingWebhook(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(wh: Webhook): void {
    setEditingWebhook(wh);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditingWebhook(null);
  }

  function handleDeleteClick(id: number): void {
    setDeleteId(id);
  }
  function handleDeleteCancel(): void {
    setDeleteId(null);
  }

  function handleDeleteConfirm(): void {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Webhook deleted");
        setDeleteId(null);
        if (selectedWebhookId === deleteId) setSelectedWebhookId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteId(null);
      },
    });
  }

  function handleRowClick(wh: Webhook): void {
    setSelectedWebhookId((prev) => (prev === wh.id ? null : wh.id));
  }

  function handleRetryEvent(eventId: number): void {
    if (!selectedWebhookId) return;
    retryMut.mutate(
      { webhookId: selectedWebhookId, eventId },
      {
        onSuccess: () => toast.success("Event queued for retry"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleDeleteDialogOpenChange(open: boolean): void {
    if (!open) setDeleteId(null);
  }

  const columns: DataTableColumn<Webhook>[] = [
    {
      key: "url",
      header: "URL",
      cell: (wh) => (
        <TruncatedText text={wh.url} className="font-mono text-xs max-w-[240px]" />
      ),
    },
    {
      key: "events",
      header: "Events",
      headerClassName: "w-[80px] text-center",
      className: "text-center",
      cell: (wh) => (
        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 border">
          {wh.events.length}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Active",
      headerClassName: "w-[70px] text-center",
      className: "text-center",
      cell: (wh) => (
        <Badge
          variant="outline"
          className={
            wh.isActive
              ? "h-4 text-[9px] px-1.5 py-0 border border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/10"
              : "h-4 text-[9px] px-1.5 py-0 border"
          }
        >
          {wh.isActive ? "Active" : "Off"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[120px]",
      className: "text-muted-foreground",
      cell: (wh) => format(new Date(wh.createdAt), "dd MMM yyyy"),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[100px]",
      cell: (wh) => (
        <WebhookActionCell
          webhook={wh}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteClick}
          canManage={canManage}
        />
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Webhooks</CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleOpenCreate}>
              Add Webhook
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 pb-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <DataTable
              data={webhooks ?? []}
              columns={columns}
              getRowKey={(wh) => wh.id}
              onRowClick={handleRowClick}
              emptyState={
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No webhooks yet. Add one to receive inventory event notifications.
                </div>
              }
              minWidth="560px"
            />
          )}
          {selectedWebhookId !== null && (
            <WebhookDeliveryLog
              webhookId={selectedWebhookId}
              events={eventsQuery.data?.items ?? []}
              isLoading={eventsQuery.isLoading}
              canManage={canManage}
              isRetrying={retryMut.isPending}
              onRetry={handleRetryEvent}
            />
          )}
        </CardContent>
      </Card>

      <WebhookCreateSheet
        open={sheetOpen}
        editingWebhook={editingWebhook}
        onOpenChange={handleSheetOpenChange}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the webhook endpoint. Events in flight may still fire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                variant="destructive"
                isPending={deleteMut.isPending}
                loadingText="Deleting…"
                onClick={handleDeleteConfirm}
              >
                Delete
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
