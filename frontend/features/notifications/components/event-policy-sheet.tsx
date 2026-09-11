"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateNotificationEventPolicy
} from "@/hooks/api/notifications";
import { policySchema, type PolicyFormValues } from "@/features/notifications/policy-schema";
import type {
  NotificationEventDefinition,
} from "@/types/notifications";

import { PRIORITIES, QUIET_HOURS_OPTIONS } from "./event-config";
import { NOTIFICATION_CHANNELS } from "@/features/notifications/notification-channels";

export function PolicySheet({
  open,
  event,
  onClose,
  canManage,
}: {
  open: boolean;
  event: NotificationEventDefinition | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const updatePolicy = useUpdateNotificationEventPolicy();

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      enabled: event?.enabled ?? true,
      defaultPriority: event?.defaultPriority ?? "NORMAL",
      defaultChannels: event?.defaultChannels ?? [],
      quietHoursBehavior: event?.quietHoursBehavior ?? "respect",
      dedupeWindowSeconds: String(event?.dedupeWindowSeconds ?? 0),
      rateLimitWindowSeconds: String(event?.rateLimitWindowSeconds ?? 0),
      rateLimitMax: String(event?.rateLimitMax ?? 0),
    },
    values: event
      ? {
          enabled: event.enabled,
          defaultPriority: event.defaultPriority,
          defaultChannels: event.defaultChannels,
          quietHoursBehavior: event.quietHoursBehavior,
          dedupeWindowSeconds: String(event.dedupeWindowSeconds),
          rateLimitWindowSeconds: String(event.rateLimitWindowSeconds),
          rateLimitMax: String(event.rateLimitMax),
        }
      : undefined,
  });

  const handleSubmit = useCallback(
    (values: PolicyFormValues) => {
      if (!event) return;
      updatePolicy.mutate(
        {
          eventKey: event.eventKey,
          enabled: values.enabled,
          defaultPriority: values.defaultPriority,
          defaultChannels: values.defaultChannels,
          quietHoursBehavior: values.quietHoursBehavior,
          dedupeWindowSeconds: Number(values.dedupeWindowSeconds),
          rateLimitWindowSeconds: Number(values.rateLimitWindowSeconds),
          rateLimitMax: Number(values.rateLimitMax),
        },
        {
          onSuccess: () => {
            toast.success("Event policy updated");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [event, updatePolicy, onClose],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  if (!event) return null;

  const allowedChannelSet = new Set(event.allowedChannels);
  const isMandatory = event.mandatory;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Configure Event</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground">{event.eventKey}</p>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form id="policy-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 gap-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                      {isMandatory && (
                        <p className="text-dense text-muted-foreground">Mandatory events cannot be disabled</p>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isMandatory || !canManage}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPriority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultChannels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Channels</FormLabel>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {NOTIFICATION_CHANNELS.filter((c) => allowedChannelSet.has(c.value)).map((c) => {
                        const checked = field.value.includes(c.value);
                        const handleChange = (checked: boolean) => {
                          field.onChange(
                            checked
                              ? [...field.value, c.value]
                              : field.value.filter((v) => v !== c.value),
                          );
                        };
                        return (
                          <label
                            key={c.value}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                              checked ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                              !canManage && "pointer-events-none opacity-60",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={handleChange}
                              disabled={!canManage}
                            />
                            {c.label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-dense text-muted-foreground mt-1">
                      Only channels allowed for this event are shown.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quietHoursBehavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiet Hours Behavior</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUIET_HOURS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dedupeWindowSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dedupe Window (s)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={!canManage} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rateLimitMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit Max</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={!canManage} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rateLimitWindowSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Limit Window (s)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="px-6 py-4 border-t justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={updatePolicy.isPending}>
            Cancel
          </Button>
          {canManage && (
            <LoadingButton
              type="submit"
              form="policy-form"
              isPending={updatePolicy.isPending}
              loadingText="Saving..."
            >
              Save Changes
            </LoadingButton>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

