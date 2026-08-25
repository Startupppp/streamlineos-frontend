"use client";

import { memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateWebhook,
  useUpdateWebhook,
  ALL_WEBHOOK_EVENTS,
  WEBHOOK_EVENT_LABELS,
  type Webhook,
} from "@/hooks/api/inventory/webhooks";

const WEBHOOK_EVENT_VALUES = [
  "inventory.product.created",
  "inventory.stock.changed",
  "inventory.stock.low",
  "inventory.po.created",
  "inventory.po.received",
  "inventory.so.reserved",
  "inventory.so.shipped",
  "inventory.transfer.completed",
  "inventory.adjustment.posted",
] as const;

export const webhookFormSchema = z.object({
  url: z.string().url("Must be a valid HTTPS URL"),
  events: z
    .array(z.enum(WEBHOOK_EVENT_VALUES))
    .min(1, "Select at least one event"),
  isActive: z.boolean(),
});
export type WebhookFormValues = z.infer<typeof webhookFormSchema>;

interface EventCheckboxProps {
  evt: string;
  label: string;
  mono: string;
  checked: boolean;
  onToggle: (evt: string, checked: boolean) => void;
}

const EventCheckbox = memo(function EventCheckbox({
  evt,
  label,
  mono,
  checked,
  onToggle,
}: EventCheckboxProps) {
  function handleCheckedChange(v: boolean): void {
    onToggle(evt, v);
  }
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={evt} checked={checked} onCheckedChange={handleCheckedChange} />
      <Label htmlFor={evt} className="text-xs font-normal cursor-pointer">
        {label}
        <span className="ml-1 text-micro text-muted-foreground font-mono">{mono}</span>
      </Label>
    </div>
  );
});

export interface WebhookCreateSheetProps {
  open: boolean;
  editingWebhook: Webhook | null;
  onOpenChange: (open: boolean) => void;
}

export function WebhookCreateSheet({ open, editingWebhook, onOpenChange }: WebhookCreateSheetProps) {
  const createMut = useCreateWebhook();
  const updateMut = useUpdateWebhook();

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { url: "", events: [], isActive: true },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset({ url: "", events: [], isActive: true });
    onOpenChange(nextOpen);
  }

  function handleEventToggle(evt: string, checked: boolean): void {
    const current = form.getValues("events");
    const isValidEvent = (v: string): v is WebhookFormValues["events"][number] =>
      (WEBHOOK_EVENT_VALUES as readonly string[]).includes(v);
    const next = checked
      ? isValidEvent(evt) ? [...current, evt] : current
      : current.filter((e) => e !== evt);
    form.setValue("events", next, { shouldValidate: true });
  }

  async function onSubmit(values: WebhookFormValues): Promise<void> {
    try {
      if (editingWebhook) {
        await updateMut.mutateAsync({
          webhookId: editingWebhook.id,
          url: values.url,
          events: values.events,
          isActive: values.isActive,
        });
        toast.success("Webhook updated");
      } else {
        await createMut.mutateAsync({
          url: values.url,
          events: values.events,
          isActive: values.isActive,
        });
        toast.success("Webhook created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</SheetTitle>
          <SheetDescription>
            {editingWebhook
              ? "Update the webhook endpoint and events."
              : "Configure a new webhook endpoint."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="flex flex-col flex-1 overflow-hidden"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <SheetBody className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL <span className="text-destructive">*</span></FormLabel>
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
                    <FormLabel>Events <span className="text-destructive">*</span></FormLabel>
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
            </SheetBody>
            <SheetFooter className="border-t px-6 py-4 gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
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
  );
}
