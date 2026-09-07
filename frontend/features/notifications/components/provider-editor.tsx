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
  NotificationProviderName,
} from "@/types/notifications";
import { NOTIFICATION_CHANNELS } from "@/features/notifications/notification-channels";

const PROVIDERS: Array<{ value: NotificationProviderName; label: string }> = [
  { value: "SMTP", label: "SMTP" },
  { value: "TWILIO", label: "Twilio" },
  { value: "META_WHATSAPP", label: "Meta WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "WEB_PUSH", label: "Web Push" },
  { value: "INTERNAL", label: "Internal" },
  { value: "SANDBOX", label: "Sandbox" },
];

export function ProviderSheet({
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
                          {NOTIFICATION_CHANNELS.map((c) => (
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
