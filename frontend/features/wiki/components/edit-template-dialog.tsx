"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateKbPageTemplate } from "@/hooks/api/kb";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";
import { editTemplateSchema, type EditTemplateFormValues } from "./edit-template-schema";
import { EditTemplateFormFields } from "./edit-template-form-fields";

interface EditTemplateDialogProps {
  template: KbPageTemplate;
  onOpenChange: (open: boolean) => void;
}

export function EditTemplateDialog({ template, onOpenChange }: EditTemplateDialogProps) {
  const updateTemplate = useUpdateKbPageTemplate();

  function handleSubmit(values: EditTemplateFormValues) {
    updateTemplate.mutate(
      { templateId: template.id, name: values.name, description: values.description ?? null },
      {
        onSuccess: () => {
          toast.success("Template updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormDialog<EditTemplateFormValues>
      open
      onOpenChange={onOpenChange}
      title="Edit template"
      resolver={zodResolver(editTemplateSchema)}
      defaultValues={{ name: template.name, description: template.description }}
      onSubmit={handleSubmit}
      isSubmitting={updateTemplate.isPending}
      submitLabel="Save changes"
    >
      {(form) => <EditTemplateFormFields form={form} />}
    </EntityFormDialog>
  );
}
