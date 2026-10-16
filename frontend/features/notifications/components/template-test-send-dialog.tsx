"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { MemberPicker } from "@/components/members/member-picker";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTestSendNotificationTemplate } from "@/hooks/api/notifications-templates";
import type { DirectoryScope } from "@/hooks/api/members/use-member-directory";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NotificationTemplate } from "@/types/notifications";
import { templateTestSendSchema, type TemplateTestSendValues } from "@/features/notifications/template-schema";

const ORG_SCOPE: DirectoryScope = { kind: "org" };

interface TemplateTestSendDialogProps {
  template: NotificationTemplate;
  onClose: () => void;
}

/** Sends the rendered template to one member through its real channel. */
export function TemplateTestSendDialog({ template, onClose }: TemplateTestSendDialogProps) {
  const testSend = useTestSendNotificationTemplate();

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: TemplateTestSendValues) {
    const variables = Object.fromEntries(template.variables.map((name, i) => [name, values.values[i] ?? ""]));
    testSend.mutate(
      { templateId: template.id, recipientId: values.recipientId ?? "", variables },
      {
        onSuccess: (result) => {
          toast.success(`Sent a test ${result.channel.toLowerCase()} notification`);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<TemplateTestSendValues>
      open
      onOpenChange={handleOpenChange}
      title={`Send a test of ${template.name}`}
      description="The template is rendered with these values and delivered for real."
      resolver={zodResolver(templateTestSendSchema)}
      defaultValues={{ recipientId: null, values: template.variables.map(() => "") }}
      onSubmit={handleSubmit}
      isSubmitting={testSend.isPending}
      submitLabel="Send test"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="recipientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient</FormLabel>
                <FormControl>
                  <MemberPicker scope={ORG_SCOPE} value={field.value ?? undefined} onChange={field.onChange} placeholder="Choose a member" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {template.variables.map((name, i) => (
            <FormField
              key={name}
              control={form.control}
              name={`values.${i}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">{name}</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </>
      )}
    </EntityFormDialog>
  );
}
