"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateNotificationTemplate,
  useUpdateNotificationTemplate,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/lib/notification-types";
import {
  templateSchema,
  type TemplateFormValues,
} from "@/features/notifications/template-schema";
import type {
  NotificationTemplate,
  NotificationChannel,
} from "@/types/notifications";
import { NOTIFICATION_CHANNELS } from "@/features/notifications/notification-channels";

const NO_CATEGORY = "none";

export function TemplateSheet({
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

