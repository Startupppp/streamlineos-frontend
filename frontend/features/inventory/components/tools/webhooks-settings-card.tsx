"use client";

import { memo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook,
  useWebhookEvents, useRetryWebhookEvent,
  ALL_WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS,
  type Webhook, type WebhookEvent,
} from "@/hooks/api/inventory/webhooks";

const webhookSchema = z.object({
  url: z.string().url("Must be a valid HTTPS URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  isActive: z.boolean(),
});
type WebhookFormValues = z.infer<typeof webhookSchema>;

const EventCheckbox = memo(function EventCheckbox({
  evt, label, mono, checked, onToggle,
}: { evt: string; label: string; mono: string; checked: boolean; onToggle: (evt: string, checked: boolean) => void }) {
  function handleCheckedChange(v: boolean): void { onToggle(evt, v); }
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={evt} checked={checked} onCheckedChange={handleCheckedChange} />
      <Label htmlFor={evt} className="text-xs font-normal cursor-pointer">
        {label}
        <span className="ml-1 text-[10px] text-muted-foreground font-mono">{mono}</span>
      </Label>
    </div>
  );
});

const WebhookActionCell = memo(function WebhookActionCell({
  webhook, onEdit, onDelete, canManage,
}: { webhook: Webhook; onEdit: (wh: Webhook) => void; onDelete: (id: number) => void; canManage: boolean }) {
  function handleEdit(e: React.MouseEvent): void { e.stopPropagation(); onEdit(webhook); }
  function handleDelete(e: React.MouseEvent): void { e.stopPropagation(); onDelete(webhook.id); }
  if (!canManage) return null;
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleEdit}>Edit</Button>
      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={handleDelete}>Del</Button>
    </div>
  );
});

const RetryEventButton = memo(function RetryEventButton({
  eventId, isPending, onRetry,
}: { eventId: number; isPending: boolean; onRetry: (id: number) => void }) {
  function handleClick(): void { onRetry(eventId); }
  return (
    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" disabled={isPending} onClick={handleClick}>
      Retry
    </Button>
  );
});

export function WebhooksSettingsCard() {
  const canManage = useCan("inventory:webhooks:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);

  const { data: webhooks, isLoading } = useWebhooks();
  const createMut = useCreateWebhook();
  const updateMut = useUpdateWebhook();
  const deleteMut = useDeleteWebhook();
  const retryMut = useRetryWebhookEvent();
  const eventsQuery = useWebhookEvents(selectedWebhookId ?? 0, { limit: 10 });

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [], isActive: true },
  });

  function handleOpenCreate(): void {
    setEditingWebhook(null);
    form.reset({ url: "", events: [], isActive: true });
    setSheetOpen(true);
  }

  function handleOpenEdit(wh: Webhook): void {
    setEditingWebhook(wh);
    form.reset({ url: wh.url, events: wh.events, isActive: wh.isActive });
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditingWebhook(null);
  }

  function handleDeleteClick(id: number): void { setDeleteId(id); }
  function handleDeleteCancel(): void { setDeleteId(null); }

  function handleDeleteConfirm(): void {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Webhook deleted");
        setDeleteId(null);
        if (selectedWebhookId === deleteId) setSelectedWebhookId(null);
      },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteId(null); },
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

  function handleEventToggle(evt: string, checked: boolean): void {
    const current = form.getValues("events");
    const next = checked ? [...current, evt] : current.filter((e) => e !== evt);
    form.setValue("events", next, { shouldValidate: true });
  }

  async function onSubmit(values: WebhookFormValues): Promise<void> {
    try {
      if (editingWebhook) {
        await updateMut.mutateAsync({ webhookId: editingWebhook.id, url: values.url, events: values.events as WebhookFormValues["events"], isActive: values.isActive });
        toast.success("Webhook updated");
      } else {
        await createMut.mutateAsync({ url: values.url, events: values.events as WebhookFormValues["events"], isActive: values.isActive });
        toast.success("Webhook created");
      }
      setSheetOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const columns: DataTableColumn<Webhook>[] = [
    {
      key: "url", header: "URL",
      cell: (wh) => <span className="font-mono text-xs truncate max-w-[240px] block">{wh.url}</span>,
    },
    {
      key: "events", header: "Events", headerClassName: "w-[80px] text-center", className: "text-center",
      cell: (wh) => <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 border">{wh.events.length}</Badge>,
    },
    {
      key: "status", header: "Active", headerClassName: "w-[70px] text-center", className: "text-center",
      cell: (wh) => (
        <Badge variant="outline" className={wh.isActive ? "h-4 text-[9px] px-1.5 py-0 border border-emerald-200 text-emerald-700 bg-emerald-50" : "h-4 text-[9px] px-1.5 py-0 border"}>
          {wh.isActive ? "Active" : "Off"}
        </Badge>
      ),
    },
    {
      key: "createdAt", header: "Created", headerClassName: "w-[120px]", className: "text-muted-foreground",
      cell: (wh) => format(new Date(wh.createdAt), "dd MMM yyyy"),
    },
    {
      key: "actions", header: "", headerClassName: "w-[100px]",
      cell: (wh) => <WebhookActionCell webhook={wh} onEdit={handleOpenEdit} onDelete={handleDeleteClick} canManage={canManage} />,
    },
  ];

  const eventColumns: DataTableColumn<WebhookEvent>[] = [
    {
      key: "eventType", header: "Event",
      cell: (ev) => WEBHOOK_EVENT_LABELS[ev.eventType] ?? ev.eventType,
    },
    {
      key: "status", header: "Status", headerClassName: "w-[90px]",
      cell: (ev) => (
        <Badge variant="outline" className={ev.status === "DELIVERED" ? "h-4 text-[9px] px-1.5 py-0 border border-emerald-200 text-emerald-700 bg-emerald-50" : ev.status === "FAILED" ? "h-4 text-[9px] px-1.5 py-0 border border-red-200 text-red-700 bg-red-50" : "h-4 text-[9px] px-1.5 py-0 border"}>
          {ev.status}
        </Badge>
      ),
    },
    {
      key: "attempts", header: "Tries", headerClassName: "w-[50px] text-right", className: "text-right tabular-nums",
      cell: (ev) => ev.attempts,
    },
    {
      key: "createdAt", header: "Date", headerClassName: "w-[110px]", className: "text-muted-foreground",
      cell: (ev) => format(new Date(ev.createdAt), "dd MMM HH:mm"),
    },
    {
      key: "retry", header: "", headerClassName: "w-[70px]",
      cell: (ev) => ev.status === "FAILED" && canManage ? <RetryEventButton eventId={ev.id} isPending={retryMut.isPending} onRetry={handleRetryEvent} /> : null,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Webhooks</CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleOpenCreate}>Add Webhook</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 pb-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <DataTable
              data={webhooks ?? []}
              columns={columns}
              getRowKey={(wh) => wh.id}
              onRowClick={handleRowClick}
              emptyState={<div className="px-4 py-6 text-center text-xs text-muted-foreground">No webhooks yet. Add one to receive inventory event notifications.</div>}
              minWidth="560px"
            />
          )}
          {selectedWebhookId !== null && (
            <div className="border-t px-4 py-3">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">
                Recent Events (Webhook #{selectedWebhookId})
              </p>
              <DataTable
                data={eventsQuery.data?.items ?? []}
                columns={eventColumns}
                getRowKey={(ev) => ev.id}
                isLoading={eventsQuery.isLoading}
                emptyState={<div className="py-4 text-center text-xs text-muted-foreground">No events yet.</div>}
                minWidth="480px"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
          <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
            <SheetTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</SheetTitle>
            <SheetDescription>
              {editingWebhook ? "Update the webhook endpoint and events." : "Configure a new webhook endpoint."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form className="flex flex-col flex-1 overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-server.com/webhook" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="events"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Events</FormLabel>
                      <div className="space-y-2">
                        {ALL_WEBHOOK_EVENTS.map((evt) => (
                          <EventCheckbox
                            key={evt}
                            evt={evt}
                            label={WEBHOOK_EVENT_LABELS[evt]}
                            mono={evt}
                            checked={field.value.includes(evt)}
                            onToggle={handleEventToggle}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <FormLabel className="cursor-pointer">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <SheetFooter className="border-t px-6 py-4 gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => handleSheetOpenChange(false)}>
                  Cancel
                </Button>
                <LoadingButton type="submit" className="flex-1" isPending={isPending} loadingText="Saving…">
                  {editingWebhook ? "Update" : "Create"}
                </LoadingButton>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
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
              <LoadingButton variant="destructive" isPending={deleteMut.isPending} loadingText="Deleting…" onClick={handleDeleteConfirm}>
                Delete
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
