"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { emailSchema, type EmailFormValues } from "./email-compose-dialog-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { useCreateTask } from "@/hooks/api/tasks";
import type { TaskEntityType } from "@/hooks/api/tasks";

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toEmail?: string | null;
  defaultSubject?: string;
  defaultBody?: string;
  entityType: TaskEntityType;
  entityId: number;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  toEmail,
  defaultSubject = "",
  defaultBody = "",
  entityType,
  entityId,
}: EmailComposeDialogProps) {
  const createTask = useCreateTask();

  const handleSubmit = useCallback(
    (values: EmailFormValues) => {
      createTask.mutate(
        {
          title: `Email: ${values.subject}`,
          type: "EMAIL",
          notes: `To: ${values.to}\n\n${values.body}`,
          entityType,
          entityId,
        },
        {
          onSuccess: () => {
            toast.success("Email logged as activity");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [createTask, entityType, entityId, onOpenChange]
  );

  return (
    <EntityFormDialog<EmailFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Compose Email"
      description="Email will be logged as an activity on this record."
      resolver={zodResolver(emailSchema)}
      defaultValues={{ to: toEmail ?? "", subject: defaultSubject, body: defaultBody }}
      onSubmit={handleSubmit}
      isSubmitting={createTask.isPending}
      submitLabel="Send & Log"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="recipient@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Email subject" maxLength={200} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea {...field} rows={6} placeholder="Write your message..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
