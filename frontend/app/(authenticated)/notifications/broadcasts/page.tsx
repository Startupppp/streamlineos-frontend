"use client";

import { useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Send, X, Megaphone, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  useBroadcasts,
  useCreateBroadcast,
  useUpdateBroadcast,
  usePublishBroadcast,
  useCancelBroadcast,
  useDeleteBroadcast,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_CONFIG,
} from "@/features/notifications/notification-types";
import type { Broadcast, BroadcastStatus } from "@/types/notifications";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

const STATUS_CONFIG: Record<BroadcastStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "border-border text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", className: "border-blue-300 text-blue-600" },
  QUEUED: { label: "Queued", className: "border-indigo-300 text-indigo-600" },
  SENDING: { label: "Sending", className: "border-amber-300 text-amber-600" },
  SENT: { label: "Sent", className: "border-emerald-300 text-emerald-600" },
  CANCELLED: { label: "Cancelled", className: "border-border text-muted-foreground" },
  FAILED: { label: "Failed", className: "border-red-300 text-red-600" },
};

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  category: z.enum(["SECURITY", "CRM", "HRMS", "BILLING", "AI", "PROJECTS", "WORKFLOW", "MARKETING", "SYSTEM"]),
  audienceType: z.enum(["all", "roles", "departments", "users"]),
  scheduledAt: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

function BroadcastSheet({
  open,
  broadcast,
  onClose,
}: {
  open: boolean;
  broadcast: Broadcast | null;
  onClose: () => void;
}) {
  const isEdit = !!broadcast;
  const create = useCreateBroadcast();
  const update = useUpdateBroadcast();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: broadcast?.title ?? "",
      message: broadcast?.message ?? "",
      type: broadcast?.type ?? "INFO",
      priority: broadcast?.priority ?? "NORMAL",
      category: broadcast?.category ?? "SYSTEM",
      audienceType: (broadcast?.audience?.type ?? "all") as "all" | "roles" | "departments" | "users",
      scheduledAt: broadcast?.scheduledAt ? String(broadcast.scheduledAt).slice(0, 16) : "",
    },
  });

  function handleSubmit(values: BroadcastFormValues) {
    const payload = {
      title: values.title,
      message: values.message,
      type: values.type,
      priority: values.priority,
      category: values.category,
      audience: { type: values.audienceType },
      channels: ["IN_APP"],
      scheduledAt: values.scheduledAt || null,
    };

    if (isEdit && broadcast) {
      update.mutate(
        { id: broadcast.id, ...payload },
        {
          onSuccess: () => { toast.success("Broadcast updated"); onClose(); },
          onError: () => toast.error("Failed to update broadcast"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Broadcast created"); onClose(); },
        onError: () => toast.error("Failed to create broadcast"),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? "Edit Broadcast" : "New Broadcast"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="System maintenance tonight" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="We will be performing maintenance on..."
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="WARNING">Warning</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {NOTIFICATION_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{NOTIFICATION_PRIORITY_CONFIG[p].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {NOTIFICATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{NOTIFICATION_CATEGORY_CONFIG[cat].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audienceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="roles">By Role</SelectItem>
                        <SelectItem value="departments">By Department</SelectItem>
                        <SelectItem value="users">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule (optional)</FormLabel>
                  <FormControl>
                    <input
                      type="datetime-local"
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">Leave empty to send immediately on publish.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Draft"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function formatDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BroadcastsPage() {
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Broadcast | null>(null);
  const [publishTarget, setPublishTarget] = useState<Broadcast | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);

  const params = activeStatus !== "ALL" ? { status: activeStatus } : undefined;
  const { data: broadcasts, isLoading, isError, refetch } = useBroadcasts(params);
  const publish = usePublishBroadcast();
  const cancel = useCancelBroadcast();
  const deleteBroadcast = useDeleteBroadcast();

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((b: Broadcast) => {
    setEditTarget(b);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const handlePublish = useCallback(() => {
    if (!publishTarget) return;
    publish.mutate(publishTarget.id, {
      onSuccess: () => { toast.success("Broadcast published"); setPublishTarget(null); },
      onError: () => toast.error("Failed to publish broadcast"),
    });
  }, [publish, publishTarget]);

  const handleCancel = useCallback(() => {
    if (!cancelTarget) return;
    cancel.mutate(cancelTarget.id, {
      onSuccess: () => { toast.success("Broadcast cancelled"); setCancelTarget(null); },
      onError: () => toast.error("Failed to cancel broadcast"),
    });
  }, [cancel, cancelTarget]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteBroadcast.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Broadcast deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete broadcast"),
    });
  }, [deleteBroadcast, deleteTarget]);

  function handleRetry() { void refetch(); }

  const items = broadcasts ?? [];

  return (
    <PageWrapper
      title="Broadcast Center"
      subtitle="Send announcements and mass notifications to your team"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Broadcast
        </Button>
      }
      filters={
        <Tabs value={activeStatus} onValueChange={setActiveStatus}>
          <TabsList className="bg-card border border-border">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load broadcasts" description="Could not load broadcasts." onRetry={handleRetry} />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<Megaphone className="h-16 w-16 text-muted-foreground/40" />}
          title="No broadcasts"
          description="Send an announcement to your entire team or specific groups."
          action={{ label: "New Broadcast", onClick: handleCreate }}
        />
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const statusCfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.DRAFT;
            const canPublish = b.status === "DRAFT" || b.status === "SCHEDULED";
            const canCancel = b.status === "QUEUED" || b.status === "SENDING" || b.status === "SCHEDULED";
            const canEdit = b.status === "DRAFT" || b.status === "SCHEDULED";
            const canDelete = b.status === "DRAFT" || b.status === "FAILED" || b.status === "CANCELLED" || b.status === "SENT";
            return (
              <Card key={b.id} className="group">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{b.title}</span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {NOTIFICATION_CATEGORY_CONFIG[b.category]?.label ?? b.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground/70">
                      {b.status === "SENT" && (
                        <span>{b.deliveredCount} / {b.recipientCount} delivered</span>
                      )}
                      {b.scheduledAt && <span>Scheduled {formatDate(b.scheduledAt)}</span>}
                      {b.sentAt && <span>Sent {formatDate(b.sentAt)}</span>}
                      <span>Audience: {b.audience?.type ?? "all"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {canPublish && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setPublishTarget(b)}
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCancelTarget(b)}
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(b)}
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => setDeleteTarget(b)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BroadcastSheet open={sheetOpen} broadcast={editTarget} onClose={handleSheetClose} />

      <AlertDialog open={!!publishTarget} onOpenChange={(v) => !v && setPublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              "{publishTarget?.title}" will be sent to{" "}
              {publishTarget?.scheduledAt ? `all recipients at ${formatDate(publishTarget.scheduledAt)}` : "all recipients immediately"}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={publish.isPending}>
              {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Stop sending "{cancelTarget?.title}". Recipients who already received it will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Sending</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? "Cancelling..." : "Cancel Broadcast"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteBroadcast.isPending}
            >
              {deleteBroadcast.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
