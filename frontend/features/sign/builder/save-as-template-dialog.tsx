"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSaveEnvelopeAsTemplate } from "@/hooks/api/sign/templates";
import { saveAsTemplateSchema, type SaveAsTemplateInput } from "./save-as-template-schema";

interface SaveAsTemplateDialogProps {
  envelopeId: number;
  envelopeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveAsTemplateDialog({ envelopeId, envelopeTitle, open, onOpenChange }: SaveAsTemplateDialogProps) {
  const saveAsTemplate = useSaveEnvelopeAsTemplate(envelopeId);

  function handleSubmit(values: SaveAsTemplateInput) {
    saveAsTemplate.mutate(values.name, {
      onSuccess: () => {
        toast.success("Saved as template");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormDialog<SaveAsTemplateInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Save as template"
      description="The documents, recipient roles and fields of this envelope become a reusable template."
      resolver={zodResolver(saveAsTemplateSchema)}
      defaultValues={{ name: `${envelopeTitle} template` }}
      onSubmit={handleSubmit}
      isSubmitting={saveAsTemplate.isPending}
      submitLabel="Save template"
      resetOnOpen
    >
      {(form) => (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template name</FormLabel>
              <FormControl>
                <Input {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
