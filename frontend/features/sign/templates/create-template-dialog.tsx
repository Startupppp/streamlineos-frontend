"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useCreateSignTemplate, useInstantiateSignTemplate } from "@/hooks/api/sign/templates";

const createTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name").max(200, "Keep the name under 200 characters"),
  description: z.string().trim().max(2000).optional(),
});

type CreateTemplateFormValues = z.infer<typeof createTemplateFormSchema>;

const STARTER_TEMPLATE = {
  routingMode: "parallel",
  ccTiming: "on_complete",
  allowDecline: true,
  expirationDays: 30,
  reminderEnabled: false,
  roles: [{ roleName: "Signer", recipientType: "signer", routingOrder: 1, authMethod: "email_link" }],
  documents: [],
  fields: [],
};

export function CreateTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const canCreateEnvelope = useCan("sign:envelope:create");
  const createTemplate = useCreateSignTemplate();
  const instantiate = useInstantiateSignTemplate();

  async function handleSubmit(values: CreateTemplateFormValues) {
    try {
      const template = await createTemplate.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        templateJson: STARTER_TEMPLATE,
      });
      if (!canCreateEnvelope) {
        toast.success("Template created");
        onOpenChange(false);
        return;
      }
      const envelope = await instantiate.mutateAsync({
        templateId: template.id,
        input: { title: values.name, recipients: [{ roleName: "Signer", name: "Signer" }] },
      });
      onOpenChange(false);
      router.push(`/sign/envelopes/${envelope.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormDialog<CreateTemplateFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New template"
      description="Name it, then add the document and fields. Save to template writes that layout back here."
      resolver={zodResolver(createTemplateFormSchema)}
      defaultValues={{ name: "", description: "" }}
      onSubmit={handleSubmit}
      isSubmitting={createTemplate.isPending || instantiate.isPending}
      submitLabel={canCreateEnvelope ? "Continue" : "Create template"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Vendor agreement" autoFocus {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="When to use this layout" {...field} />
                </FormControl>
                <FormDescription>Optional. Shown on the templates list.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
