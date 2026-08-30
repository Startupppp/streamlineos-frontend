"use client";

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
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
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  SendIcon,
  UserPenIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
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
import { broadcastSchema, type BroadcastFormValues } from "@/features/notifications/broadcast-schema";
import type { Broadcast, BroadcastStatus } from "@/types/notifications";

import { STATUS_TABS, formatDate } from "@/features/notifications/components/broadcast-config";
import { BroadcastSheet } from "@/features/notifications/components/broadcast-editor";
import { BroadcastRow } from "@/features/notifications/components/broadcast-row";

export default function BroadcastsPage() {
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Broadcast | null>(null);
  const [publishTarget, setPublishTarget] = useState<Broadcast | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);

  const params = activeStatus !== "ALL" ? { status: activeStatus } : undefined;
  const { data: broadcastData, isLoading, isError, refetch } = useBroadcasts(params);
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

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const items = broadcastData?.items ?? [];

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
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Tabs value={activeStatus} onValueChange={setActiveStatus}>
          <PageTabsToolbar
            tabsDensity="labeled"
            tabs={
              <TabsList>
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                ))}
              </TabsList>
            }
          />
        </Tabs>

        {isLoading ? (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Failed to load broadcasts" description="Could not load broadcasts." onRetry={handleRetry} />
        ) : items.length === 0 ? (
          <EmptyState
            illustrationPreset="mail"
            title="No broadcasts"
            description="Send an announcement to your entire team or specific groups."
            action={{ label: "New Broadcast", onClick: handleCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border flex-1 min-h-0">
            {items.map((b, idx) => (
              <BroadcastRow
                key={b.id}
                broadcast={b}
                idx={idx}
                onPublish={setPublishTarget}
                onCancel={setCancelTarget}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <BroadcastSheet open={sheetOpen} broadcast={editTarget} onClose={handleSheetClose} />

      <AlertDialog open={!!publishTarget} onOpenChange={(v) => !v && setPublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{publishTarget?.title}&rdquo; will be sent to{" "}
              {publishTarget?.scheduledAt
                ? `all recipients at ${formatDate(publishTarget.scheduledAt)}`
                : "all recipients immediately"}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={publish.isPending}>
              {publish.isPending ? "Sending..." : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Stop sending &ldquo;{cancelTarget?.title}&rdquo;. Recipients who already received it will not be affected.
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
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
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
