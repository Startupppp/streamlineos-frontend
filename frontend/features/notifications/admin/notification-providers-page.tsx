"use client";

import { useState, useCallback } from "react";
import { Plus, FlaskConical, Server } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  UserPenIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import {
  useNotificationProviders,
  useCreateNotificationProvider,
  useUpdateNotificationProvider,
  useDeleteNotificationProvider,
  useTestNotificationProvider,
} from "@/hooks/api/notifications";
import { useCan } from "@/hooks/api/access";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { providerSchema, type ProviderFormValues } from "@/features/notifications/provider-schema";
import type {
  NotificationProvider,
  NotificationChannel,
  NotificationProviderName,
} from "@/types/notifications";

import { ProviderSheet } from "@/features/notifications/components/provider-editor";
import { ProviderRow } from "@/features/notifications/components/provider-row";

export function NotificationProvidersPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationProvider | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    useState<NotificationProvider | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: providers, isLoading, isError, error, refetch } =
    useNotificationProviders();
  const deleteProvider = useDeleteNotificationProvider();
  const testProvider = useTestNotificationProvider();
  const canManage = useCan("notifications:providers:manage");

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((p: NotificationProvider) => {
    setEditTarget(p);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const handleTest = useCallback(
    (p: NotificationProvider) => {
      setTestingId(p.id);
      testProvider.mutate(
        { providerId: p.id },
        {
          onSuccess: (result) => {
            const sandboxNote = result.sandbox ? " (sandbox)" : "";
            if (result.status === "SENT") {
              toast.success(`${result.message}${sandboxNote}`);
            } else {
              toast.error(`${result.message}${sandboxNote}`);
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setTestingId(null),
        },
      );
    },
    [testProvider],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteProvider.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Provider deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteProvider]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Notification Providers"
      subtitle="Configure delivery channels for sending notifications to users"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Provider
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="flex-1 rounded-lg border border-border overflow-hidden divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load providers"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !providers?.length ? (
          <EmptyState
            illustrationPreset="settings"
            title="No providers configured"
            description="Add a delivery provider to start sending notifications across channels."
            action={
              canManage
                ? { label: "New Provider", onClick: handleCreate }
                : undefined
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {providers.map((p, idx) => (
              <ProviderRow
                key={p.id}
                provider={p}
                idx={idx}
                canManage={canManage}
                testingId={testingId}
                onTest={handleTest}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <ProviderSheet
        open={sheetOpen}
        provider={editTarget}
        onClose={handleSheetClose}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete provider?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.displayName}&rdquo; will be permanently
              removed. Notifications routed through this provider will fall back
              to the next available provider for the channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteProvider.isPending}
            >
              {deleteProvider.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
