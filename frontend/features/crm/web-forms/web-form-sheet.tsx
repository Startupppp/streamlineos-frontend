"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWebForm, useUpdateWebForm } from "@/hooks/api/crm/web-forms";
import type { WebForm } from "@/hooks/api/crm/web-forms-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { WebFormFieldsEditor } from "./web-form-fields-editor";
import { toWebFormInput, toWebFormValues, webFormSchema, type WebFormValues } from "./web-form-schema";

interface WebFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates. */
  webForm: WebForm | null;
}

export function WebFormSheet({ open, onOpenChange, webForm }: WebFormSheetProps) {
  const create = useCreateWebForm();
  const update = useUpdateWebForm();
  const defaults = useMemo(() => toWebFormValues(webForm), [webForm]);

  const handleSubmit = (values: WebFormValues) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(webForm ? "Form saved" : "Form created");
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(getErrorMessage(error)),
    };
    if (webForm) update.mutate({ id: webForm.id, ...toWebFormInput(values, "update") }, callbacks);
    else create.mutate(toWebFormInput(values, "create"), callbacks);
  };

  return (
    <EntityFormSheet<WebFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={webForm ? "Edit web form" : "New web form"}
      description="A public form whose every submission becomes a lead."
      resolver={zodResolver(webFormSchema)}
      defaultValues={defaults}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending || update.isPending}
      submitLabel={webForm ? "Save" : "Create form"}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <WebFormFieldsEditor form={form} />
          <FormField
            control={form.control}
            name="submitMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thank-you message</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Thank you! We'll be in touch soon." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="redirectUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Redirect after submit</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com/thanks" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Accepting submissions" />
                </FormControl>
                <FormLabel className="!mt-0">Accepting submissions</FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
