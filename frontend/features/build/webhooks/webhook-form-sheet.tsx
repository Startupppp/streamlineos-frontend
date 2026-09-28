"use client";

import type { UseFormReturn } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { setListMembership } from "@/lib/toggle-in-list";
import { cn } from "@/lib/utils";
import type { WebhookFormValues } from "@/features/build/webhooks/webhook-schema";

export const WEBHOOK_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.deleted", label: "Ticket Deleted" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "comment.created", label: "Comment Added" },
  { value: "member.added", label: "Member Added" },
  { value: "member.removed", label: "Member Removed" },
];

function subscribeToEvent(
  onChange: (events: string[]) => void,
  subscribed: string[],
  event: string,
): (checked: boolean | "indeterminate") => void {
  return function handleEventSubscriptionToggle(checked) {
    onChange(setListMembership(subscribed, event, checked !== false));
  };
}

interface WebhookFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  isPending: boolean;
  form: UseFormReturn<WebhookFormValues>;
  onSubmit: (values: WebhookFormValues) => void;
  onCancel: () => void;
}

export function WebhookFormSheet({
  open,
  onOpenChange,
  isEditing,
  isPending,
  form,
  onSubmit,
  onCancel,
}: WebhookFormSheetProps) {
  useRegisterDirtyState(open && form.formState.isDirty);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEditing ? "Edit Webhook" : "New Webhook"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form
              id="webhook-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Payload URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/webhook"
                        className="text-sm font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Events to subscribe
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <label
                          key={ev.value}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all duration-150 select-none",
                            field.value.includes(ev.value)
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:border-border/80 bg-card",
                          )}
                        >
                          <Checkbox
                            checked={field.value.includes(ev.value)}
                            onCheckedChange={subscribeToEvent(
                              field.onChange,
                              field.value,
                              ev.value,
                            )}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs font-medium">{ev.label}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {!isEditing && (
                <FormField
                  control={form.control}
                  name="secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Signing Secret{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Used to sign payloads"
                          type="password"
                          className="text-sm font-mono"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </SheetBody>
        <div className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              type="submit"
              form="webhook-form"
              isPending={isPending}
              loadingText={isEditing ? "Saving…" : "Creating…"}
            >
              {isEditing ? "Save Changes" : "Create Webhook"}
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
