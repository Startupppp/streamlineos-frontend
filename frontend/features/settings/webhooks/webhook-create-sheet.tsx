"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateWebhook } from "@/hooks/api/webhooks";
import {
  AVAILABLE_EVENTS,
  webhookCreateSchema,
  type WebhookCreateFormValues,
} from "./webhook-schema";

interface WebhookCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface EventCheckboxItemProps {
  event: { id: string; label: string };
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

function EventCheckboxItem({ event, checked, onToggle }: EventCheckboxItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`ev-${event.id}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <label htmlFor={`ev-${event.id}`} className="text-sm cursor-pointer">
        <span className="font-mono text-xs text-muted-foreground mr-2">
          {event.id}
        </span>
        {event.label}
      </label>
    </div>
  );
}

export function WebhookCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: WebhookCreateSheetProps) {
  const createWebhook = useCreateWebhook();

  const form = useForm<WebhookCreateFormValues>({
    resolver: zodResolver(webhookCreateSchema),
    defaultValues: {
      url: "",
      description: "",
      events: [],
    },
  });

  const handleSubmit = useCallback(
    (values: WebhookCreateFormValues) => {
      createWebhook.mutate(
        {
          url: values.url,
          description: values.description || undefined,
          events: values.events,
        },
        {
          onSuccess: () => {
            toast.success("Webhook created");
            form.reset();
            onCreated?.();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createWebhook, form, onCreated, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Add Webhook</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form
              id="webhook-create-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Endpoint URL <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="https://your-server.com/webhook"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Notify the team on deal won"
                        {...field}
                      />
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
                    <FormLabel>Events to send</FormLabel>
                    <div className="grid grid-cols-1 gap-2">
                      {AVAILABLE_EVENTS.map((ev) => (
                        <EventCheckboxItem
                          key={ev.id}
                          event={ev}
                          checked={field.value.includes(ev.id)}
                          onToggle={(checked) => {
                            if (checked)
                              field.onChange([...field.value, ev.id]);
                            else
                              field.onChange(field.value.filter((e) => e !== ev.id));
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="webhook-create-form"
              isPending={createWebhook.isPending}
              loadingText="Creating…"
            >
              Create Webhook
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
