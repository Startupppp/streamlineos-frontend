"use client";

import { useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Eye, LayoutTemplate } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
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
  NOTIFICATION_CATEGORY_VALUES,
} from "@/features/notifications/notification-types";
import type { NotificationTemplate, NotificationChannel } from "@/types/notifications";

const NO_CATEGORY = "none";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SLACK", label: "Slack" },
  { value: "TEAMS", label: "Teams" },
  { value: "WEBHOOK", label: "Webhook" },
];

const templateSchema = z.object({
  templateKey: z.string().min(1).regex(/^[a-z0-9_.-]+$/, "Lowercase letters, numbers, dashes, dots only"),
  name: z.string().min(1, "Name is required"),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "SLACK", "TEAMS", "WEBHOOK"]),
  category: z.union([z.enum(NOTIFICATION_CATEGORY_VALUES), z.literal("none")]).optional(),
  locale: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
  variables: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

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
      ? values.variables.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
    const payload = { ...values, variables, subject: values.subject || undefined, category: values.category === NO_CATEGORY ? undefined : values.category };

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
        <div className="flex-1 overflow-y-auto px-6 py-4">
        <Form {...form}>
          <form id="template-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="templateKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Key</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. invoice.payment.due" disabled={isEdit} {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>None</SelectItem>
                        {NOTIFICATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{NOTIFICATION_CATEGORY_CONFIG[cat].label}</SelectItem>
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
                  <p className="text-[11px] text-muted-foreground">
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
                    <Input placeholder="invoiceNumber, amount, dueDate" {...field} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">Comma-separated variable names.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        </div>
        <SheetFooter className="px-6 py-4 justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="template-form" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create"}
          </Button>
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
  const [result, setResult] = useState<{ subject: string | null; body: string } | null>(null);

  function handlePreview() {
    if (!template) return;
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => { vars[v] = `{{${v}}}`; });
    preview.mutate(
      { id: template.id, variables: vars },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error("Failed to preview template"),
      },
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) { setResult(null); onClose(); }
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
                  <p className="text-xs font-medium text-muted-foreground uppercase">Subject</p>
                  <p className="text-sm font-medium">{result.subject}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Body</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {result.body}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Variables: <span className="font-mono">{template?.variables.join(", ") || "none"}</span>
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{template?.body}</div>
            </div>
          )}
          <Button
            className="w-full"
            variant="outline"
            onClick={handlePreview}
            disabled={preview.isPending}
          >
            {preview.isPending ? "Generating..." : "Render with sample variables"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificationTemplatesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<NotificationTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null);

  const { data: templates, isLoading, isError, refetch } = useNotificationTemplates();
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

  function handleRetry() {
    void refetch();
  }

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
      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground/25 mb-3" />
          <p className="text-sm font-medium text-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
            Create reusable notification templates to standardize messages sent to your team.
          </p>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {templates.map((t) => {
            const catConfig = t.category ? NOTIFICATION_CATEGORY_CONFIG[t.category] : null;
            return (
              <div key={t.id} className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                      {t.channel}
                    </Badge>
                    {catConfig && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                        {catConfig.label}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-4 px-1.5 shrink-0",
                        t.isActive ? "border-emerald-300 text-emerald-600" : "text-muted-foreground",
                      )}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] font-mono text-muted-foreground/70">{t.templateKey}</p>
                  {t.subject && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      Subject: {t.subject}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    v{t.version} · {t.locale}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setPreviewTarget(t)}
                    title="Preview"
                  >
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEdit(t)}
                    title="Edit"
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={() => setDeleteTarget(t)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TemplateSheet open={sheetOpen} template={editTarget} onClose={handleSheetClose} />

      <PreviewDialog
        open={!!previewTarget}
        template={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Notifications using this template will continue with their last rendered content.
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
