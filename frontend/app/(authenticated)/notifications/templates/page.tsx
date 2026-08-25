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

const NO_CATEGORY = "none";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
];

function TemplateSheet({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}) {
  const isEdit = !!template;
  const create = useCreateNotificationTemplate();
  const update = useUpdateNotificationTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      templateKey: template?.templateKey ?? "",
      name: template?.name ?? "",
      channel: (template?.channel ?? "IN_APP") as NotificationChannel,
      category: template?.category ?? NO_CATEGORY,
      locale: template?.locale ?? "en",
      subject: template?.subject ?? "",
      body: template?.body ?? "",
      variables: template?.variables?.join(", ") ?? "",
    },
  });

  function handleSubmit(values: TemplateFormValues) {
    const variables = values.variables
      ? values.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
    const payload = {
      ...values,
      variables,
      subject: values.subject || undefined,
      category: values.category === NO_CATEGORY ? undefined : values.category,
    };

    if (isEdit && template) {
      update.mutate(
        { id: template.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Template updated");
            onClose();
          },
          onError: () => toast.error("Failed to update template"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Template created");
          onClose();
        },
        onError: () => toast.error("Failed to create template"),
      });
    }
  }

  const isPending = create.isPending || update.isPending;
  const channel = form.watch("channel");
  const needsSubject = channel === "EMAIL";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Template" : "New Template"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form
              id="template-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="templateKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. invoice.payment.due"
                        disabled={isEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice Payment Due" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHANNELS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_CATEGORY}>None</SelectItem>
                          {NOTIFICATION_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {NOTIFICATION_CATEGORY_CONFIG[cat].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <Input placeholder="en" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {needsSubject && (
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Your invoice is due" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}."
                        rows={5}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-dense text-muted-foreground">
                      Use {"{{variable}}"} syntax for dynamic values.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="variables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variables</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="invoiceNumber, amount, dueDate"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-dense text-muted-foreground">
                      Comma-separated variable names.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="px-6 py-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="template-form"
            isPending={isPending}
            loadingText="Saving..."
          >
            {isEdit ? "Save Changes" : "Create"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PreviewDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}) {
  const preview = usePreviewTemplate();
  const [result, setResult] = useState<{
    subject: string | null;
    body: string;
  } | null>(null);

  function handlePreview() {
    if (!template) return;
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => {
      vars[v] = `{{${v}}}`;
    });
    preview.mutate(
      { id: template.id, variables: vars },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error("Failed to preview template"),
      },
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setResult(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview — {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {result ? (
            <>
              {result.subject && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{result.subject}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Body
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {result.body}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Variables:{" "}
                <span className="font-mono">
                  {template?.variables.join(", ") || "none"}
                </span>
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {template?.body}
              </div>
            </div>
          )}
          <LoadingButton
            className="w-full"
            variant="outline"
            onClick={handlePreview}
            isPending={preview.isPending}
            loadingText="Generating..."
          >
            Render with sample variables
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Only these channels gate sending on a provider-approved template. */
function requiresApproval(template: NotificationTemplate): boolean {
  return template.channel === "WHATSAPP" || template.channel === "SMS";
}

function TemplateRow({
  template,
  idx,
  onPreview,
  onEdit,
  onDelete,
  onApproval,
}: {
  template: NotificationTemplate;
  idx: number;
  onPreview: (t: NotificationTemplate) => void;
  onEdit: (t: NotificationTemplate) => void;
  onDelete: (t: NotificationTemplate) => void;
  onApproval: (t: NotificationTemplate) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const previewAnim = useAnimatedIcon();
  const editAnim = useAnimatedIcon();
  const deleteAnim = useAnimatedIcon();

  const catConfig = template.category
    ? NOTIFICATION_CATEGORY_CONFIG[template.category]
    : null;

  const handlePreviewClick = useCallback(
    () => onPreview(template),
    [onPreview, template],
  );
  const handleEditClick = useCallback(
    () => onEdit(template),
    [onEdit, template],
  );
  const handleDeleteClick = useCallback(
    () => onDelete(template),
    [onDelete, template],
  );
  const handleApprovalClick = useCallback(
    () => onApproval(template),
    [onApproval, template],
  );

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(idx, 10) * 0.04,
        ease: "easeOut",
      }}
      className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{template.name}</span>
          <Badge variant="outline" className="text-micro h-4 px-1.5 shrink-0">
            {template.channel}
          </Badge>
          {catConfig && (
            <Badge
              variant="secondary"
              className="text-micro h-4 px-1.5 shrink-0"
            >
              {catConfig.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-micro h-4 px-1.5 shrink-0",
              template.isActive
                ? "border-emerald-300 text-emerald-600"
                : "text-muted-foreground",
            )}
          >
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
          {/* COMP-004/005: WhatsApp and SMS refuse an unapproved template, so a template
              that looks Active can still send nothing. Say so on the card. */}
          {requiresApproval(template) &&
            template.approvalStatus !== "APPROVED" && (
              <Badge
                variant="outline"
                className="text-micro h-4 px-1.5 shrink-0 border-amber-300 text-amber-600 dark:border-amber-500/30 dark:text-amber-300"
              >
                {template.approvalStatus === "REJECTED"
                  ? "Rejected"
                  : "Not approved"}
              </Badge>
            )}
        </div>
        <p className="mt-0.5 text-dense font-mono text-muted-foreground/70">
          {template.templateKey}
        </p>
        {template.subject && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            Subject: {template.subject}
          </p>
        )}
        <p className="text-dense text-muted-foreground/50 mt-0.5">
          v{template.version} · {template.locale}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handlePreviewClick}
          title="Preview"
          {...previewAnim.hoverHandlers}
        >
          <EyeIcon
            ref={previewAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleEditClick}
          title="Edit"
          {...editAnim.hoverHandlers}
        >
          <UserPenIcon
            ref={editAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
        {requiresApproval(template) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleApprovalClick}
            title="Provider approval"
          >
            <BadgeCheck size={12} className="text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:text-destructive"
          onClick={handleDeleteClick}
          title="Delete"
          {...deleteAnim.hoverHandlers}
        >
          <Trash2Icon
            ref={deleteAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
      </div>
    </motion.div>
  );
}

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
