"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateHrWebhook,
  useUpdateHrWebhook,
  useHrWebhookEvents,
} from "@/hooks/api/hr/hr-webhooks";
import type { HrWebhookSubscription } from "@/types/hr/webhooks";
import type { HrAutomationEvent } from "@/types/hr/automations";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  url: z
    .string()
    .url("Enter a valid URL")
    .refine((u) => u.startsWith("https://"), "Must use HTTPS"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: HrWebhookSubscription;
}

export function WebhookUpsertSheet({ open, onOpenChange, subscription }: Props) {
  const isEdit = !!subscription;
  const create = useCreateHrWebhook();
  const update = useUpdateHrWebhook();
  const { data: eventsData } = useHrWebhookEvents();
  const events = eventsData?.events ?? [];

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: subscription?.name ?? "",
      url: subscription?.url ?? "",
      events: subscription?.events ?? [],
      isActive: subscription?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: subscription?.name ?? "",
        url: subscription?.url ?? "",
        events: (subscription?.events as string[]) ?? [],
        isActive: subscription?.isActive ?? true,
      });
      setRevealedSecret(null);
      setShowSecret(false);
    }
  }, [open, subscription, form]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      try {
        if (isEdit && subscription) {
          await update.mutateAsync({
            id: subscription.id,
            name: values.name,
            url: values.url,
            events: values.events as HrAutomationEvent[],
            isActive: values.isActive,
          });
          toast.success("Webhook updated");
          onOpenChange(false);
        } else {
          const result = await create.mutateAsync({
            name: values.name,
            url: values.url,
            events: values.events as HrAutomationEvent[],
            isActive: values.isActive,
          });
          setRevealedSecret(result.secret);
          toast.success("Webhook created — copy your secret now");
        }
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [isEdit, subscription, create, update, onOpenChange],
  );

  const handleCopySecret = useCallback(() => {
    if (!revealedSecret) return;
    void navigator.clipboard.writeText(revealedSecret);
    toast.success("Secret copied to clipboard");
  }, [revealedSecret]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{isEdit ? "Edit Webhook" : "New Webhook Subscription"}</SheetTitle>
        </SheetHeader>

        {revealedSecret ? (
          <div className="flex-1 flex flex-col gap-4 px-6 py-6">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Copy your secret — it will not be shown again</p>
              <p className="text-xs text-amber-700">
                Use this to verify the{" "}
                <code className="bg-amber-100 px-1 rounded">X-StreamlineOS-Signature</code> header
                on incoming requests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs bg-muted rounded-md px-3 py-2 break-all">
                {showSecret ? revealedSecret : "•".repeat(64)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSecret((p) => !p)}
                className="shrink-0"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopySecret}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-auto">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My HR Webhook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endpoint URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/webhooks/hr"
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
                        <FormLabel>Events</FormLabel>
                        <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                          {events.map((ev) => {
                            const checked = field.value.includes(ev.value);
                            return (
                              <label
                                key={ev.value}
                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    field.onChange(
                                      c
                                        ? [...field.value, ev.value]
                                        : field.value.filter((v) => v !== ev.value),
                                    );
                                  }}
                                />
                                <span className="text-sm font-mono text-muted-foreground">
                                  {ev.value}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="is-active"
                          />
                          <FormLabel htmlFor="is-active" className="cursor-pointer font-normal">
                            Active — deliver events immediately
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>

              <SheetFooter className="px-6 py-4 border-t shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending}>
                  {isEdit ? "Save Changes" : "Create Webhook"}
                </LoadingButton>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
