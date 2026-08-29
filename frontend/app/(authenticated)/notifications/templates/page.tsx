"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { TemplateApprovalDialog } from "@/features/notifications/components/template-approval-dialog";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EyeIcon, UserPenIcon, Trash2Icon } from "@animateicons/react/lucide";
import {
  useNotificationTemplates,
  useCreateNotificationTemplate,
  useUpdateNotificationTemplate,
  useDeleteNotificationTemplate,
  usePreviewTemplate,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import {
  templateSchema,
  type TemplateFormValues,
} from "@/features/notifications/template-schema";
import type {
  NotificationTemplate,
  NotificationChannel,
} from "@/types/notifications";

import { TemplateSheet } from "@/features/notifications/components/template-editor";
import { PreviewDialog } from "@/features/notifications/components/template-preview";
import { TemplateRow } from "@/features/notifications/components/template-row";

export default function NotificationTemplatesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationTemplate | null>(
    null,
  );
  const [previewTarget, setPreviewTarget] =
    useState<NotificationTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(
    null,
  );
  const [approvalTarget, setApprovalTarget] =
    useState<NotificationTemplate | null>(null);

  const handleApprovalOpenChange = useCallback((open: boolean) => {
    if (!open) setApprovalTarget(null);
  }, []);

  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useNotificationTemplates();
  const deleteTemplate = useDeleteNotificationTemplate();

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((t: NotificationTemplate) => {
    setEditTarget(t);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete template"),
    });
  }, [deleteTarget, deleteTemplate]);

  const handleSetDeleteTarget = useCallback(
    (t: NotificationTemplate) => setDeleteTarget(t),
    [],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Notification Templates"
      subtitle="Manage reusable templates for automated notifications"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load templates"
            description="Could not load notification templates."
            onRetry={handleRetry}
          />
        ) : !templates?.length ? (
          <EmptyState
            illustrationPreset="mail"
            title="No templates yet"
            description="Create reusable notification templates to standardize messages sent to your team."
            action={{ label: "Create Template", onClick: handleCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {templates.map((t, idx) => (
              <TemplateRow
                key={t.id}
                template={t}
                idx={idx}
                onPreview={setPreviewTarget}
                onEdit={handleEdit}
                onDelete={handleSetDeleteTarget}
                onApproval={setApprovalTarget}
              />
            ))}
          </div>
        )}
      </div>

      <TemplateSheet
        open={sheetOpen}
        template={editTarget}
        onClose={handleSheetClose}
      />

      <PreviewDialog
        open={!!previewTarget}
        template={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      {approvalTarget && (
        <TemplateApprovalDialog
          template={approvalTarget}
          open={!!approvalTarget}
          onOpenChange={handleApprovalOpenChange}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
              Notifications using this template will continue with their last
              rendered content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
