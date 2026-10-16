"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useSendEmailTemplateTest } from "@/hooks/api/notifications-templates";
import type { EmailTemplatePreview } from "@/hooks/api/notifications-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { emailTemplateTestSchema, type EmailTemplateTestValues } from "@/features/notifications/email-template-test-schema";

interface EmailTemplateTestDialogProps {
  template: EmailTemplatePreview;
  defaultEmail: string;
  onClose: () => void;
}

export function EmailTemplateTestDialog({ template, defaultEmail, onClose }: EmailTemplateTestDialogProps) {
  const send = useSendEmailTemplateTest();

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: EmailTemplateTestValues) {
    send.mutate(
      { templateId: template.id, ...values },
      {
        onSuccess: (result) => {
          toast.success(`Sent a test of ${template.name} to ${result.to}`);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<EmailTemplateTestValues>
      open
      onOpenChange={handleOpenChange}
      title={`Send a test of ${template.name}`}
      description="Delivered with sample data. Tests are rate limited."
      resolver={zodResolver(emailTemplateTestSchema)}
      defaultValues={{ testEmail: defaultEmail, locale: template.locale }}
      onSubmit={handleSubmit}
      isSubmitting={send.isPending}
      submitLabel="Send test"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="testEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Send to</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {template.supportedLocales.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {locale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
