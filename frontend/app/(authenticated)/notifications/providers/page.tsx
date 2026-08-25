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
import { formatRelativeTime } from "@/features/notifications/format-relative-time";
import { providerSchema, type ProviderFormValues } from "@/features/notifications/provider-schema";
import type {
  NotificationProvider,
  NotificationChannel,
  NotificationProviderName,
} from "@/types/notifications";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
];

const PROVIDERS: Array<{ value: NotificationProviderName; label: string }> = [
  { value: "SMTP", label: "SMTP" },
  { value: "TWILIO", label: "Twilio" },
  { value: "META_WHATSAPP", label: "Meta WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "WEB_PUSH", label: "Web Push" },
  { value: "INTERNAL", label: "Internal" },
  { value: "SANDBOX", label: "Sandbox" },
];

function ProviderSheet({
  open,
  provider,
  onClose,
}: {
  open: boolean;
  provider: NotificationProvider | null;
  onClose: () => void;
}) {
  const isEdit = !!provider;
  const create = useCreateNotificationProvider();
  const update = useUpdateNotificationProvider();

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      channel: provider?.channel ?? "EMAIL",
      provider: provider?.provider ?? "SMTP",
      displayName: provider?.displayName ?? "",
      config: "",
      enabled: provider?.enabled ?? true,
      sandboxMode: provider?.sandboxMode ?? false,
      isDefault: provider?.isDefault ?? false,
      dailySendLimit:
        provider?.dailySendLimit != null
          ? String(provider.dailySendLimit)
          : "",
      monthlyCostLimit:
        provider?.monthlyCostLimit != null
          ? String(provider.monthlyCostLimit)
          : "",
    },
  });

  const handleSubmit = useCallback(
    (values: ProviderFormValues) => {
      let parsedConfig: Record<string, unknown> | undefined;
      if (values.config && values.config.trim() !== "") {
        try {
          const raw: unknown = JSON.parse(values.config);
          const result = z.record(z.string(), z.unknown()).safeParse(raw);
          if (!result.success) {
            form.setError("config", {
              message: "Config must be a valid JSON object",
            });
            return;
          }
          parsedConfig = result.data;
        } catch {
          form.setError("config", {
            message: "Config must be a valid JSON object",
          });
          return;
        }
      }

      const dailySendLimit =
        values.dailySendLimit && values.dailySendLimit.trim() !== ""
          ? Number(values.dailySendLimit)
          : isEdit
          ? null
          : undefined;

      const monthlyCostLimit =
        values.monthlyCostLimit && values.monthlyCostLimit.trim() !== ""
          ? Number(values.monthlyCostLimit)
          : isEdit
          ? null
          : undefined;

      if (isEdit && provider) {
        update.mutate(
          {
            id: provider.id,
            displayName: values.displayName,
            enabled: values.enabled,
            sandboxMode: values.sandboxMode,
            isDefault: values.isDefault,
            dailySendLimit,
            monthlyCostLimit,
            ...(parsedConfig !== undefined ? { config: parsedConfig } : {}),
          },
          {
            onSuccess: () => {
              toast.success("Provider updated");
              onClose();
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        create.mutate(
          {
            channel: values.channel,
            provider: values.provider,
            displayName: values.displayName,
            enabled: values.enabled,
            sandboxMode: values.sandboxMode,
            isDefault: values.isDefault,
            dailySendLimit: dailySendLimit as number | null | undefined,
            monthlyCostLimit: monthlyCostLimit as number | null | undefined,
            ...(parsedConfig !== undefined ? { config: parsedConfig } : {}),
          },
          {
            onSuccess: () => {
              toast.success("Provider created");
              onClose();
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      }
    },
    [create, update, isEdit, provider, form, onClose],
  );

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>
            {isEdit ? "Edit Provider" : "New Provider"}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form
              id="provider-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
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
                        disabled={isEdit}
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
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
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
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Primary Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Config (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          isEdit
                            ? "Leave blank to keep existing credentials"
                            : '{ "apiKey": "..." }'
                        }
                        rows={4}
                        className="resize-none font-mono text-xs"
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
                  name="dailySendLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Send Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyCostLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Cost Limit ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <FormLabel className="cursor-pointer">Enabled</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sandboxMode"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <FormLabel className="cursor-pointer">Sandbox Mode</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <FormLabel className="cursor-pointer">
                      Set as Default
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
            form="provider-form"
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

function HealthDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        status === "healthy" && "bg-status-success-fill",
        status === "unhealthy" && "bg-status-danger-fill",
        status !== "healthy" && status !== "unhealthy" && "bg-muted-foreground/40",
      )}
      title={status}
    />
  );
}

function ProviderRow({
  provider,
  idx,
  canManage,
  testingId,
  onTest,
  onEdit,
  onDelete,
}: {
  provider: NotificationProvider;
  idx: number;
  canManage: boolean;
  testingId: number | null;
  onTest: (p: NotificationProvider) => void;
  onEdit: (p: NotificationProvider) => void;
  onDelete: (p: NotificationProvider) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const editAnim = useAnimatedIcon();
  const deleteAnim = useAnimatedIcon();

  const handleTestClick = useCallback(() => onTest(provider), [onTest, provider]);
  const handleEditClick = useCallback(() => onEdit(provider), [onEdit, provider]);
  const handleDeleteClick = useCallback(() => onDelete(provider), [onDelete, provider]);

  const isTesting = testingId === provider.id;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(idx, 10) * 0.04, ease: "easeOut" }}
      className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2 mt-0.5 shrink-0">
        <HealthDot status={provider.healthStatus} />
        <Server className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{provider.displayName}</span>
          <Badge
            variant="outline"
            className="text-micro h-4 px-1.5 shrink-0"
          >
            {provider.channel}
          </Badge>
          <Badge
            variant="secondary"
            className="text-micro h-4 px-1.5 shrink-0"
          >
            {provider.provider}
          </Badge>
          {provider.isDefault && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-primary/30 text-primary"
            >
              Default
            </Badge>
          )}
          {provider.sandboxMode && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-status-warning-rule text-status-warning-ink"
            >
              Sandbox
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-micro h-4 px-1.5 shrink-0",
              provider.enabled
                ? "border-status-success-rule text-status-success-ink"
                : "text-muted-foreground",
            )}
          >
            {provider.enabled ? "Enabled" : "Disabled"}
          </Badge>
          {!provider.hasCredentials && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-destructive/40 text-destructive"
            >
              No credentials
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 flex-wrap">
          {provider.dailySendLimit != null && (
            <span className="text-dense text-muted-foreground/70">
              Limit: {provider.dailySendLimit.toLocaleString()}/day
            </span>
          )}
          {provider.monthlyCostLimit != null && (
            <span className="text-dense text-muted-foreground/70">
              Cost cap: ${provider.monthlyCostLimit}/mo
            </span>
          )}
          {provider.lastTestedAt && (
            <span className="text-dense text-muted-foreground/50">
              Tested {formatRelativeTime(provider.lastTestedAt)}
            </span>
          )}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Test provider"
            onClick={handleTestClick}
            disabled={isTesting}
          >
            <FlaskConical className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Edit provider"
            onClick={handleEditClick}
            {...editAnim.hoverHandlers}
          >
            <UserPenIcon ref={editAnim.iconRef} size={12} className="text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            aria-label="Delete provider"
            onClick={handleDeleteClick}
            {...deleteAnim.hoverHandlers}
          >
            <Trash2Icon ref={deleteAnim.iconRef} size={12} className="text-muted-foreground" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function NotificationProvidersPage() {
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
        { id: p.id },
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
