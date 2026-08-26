"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  RecordForm,
  asRecordValue,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  type EmailTemplate,
  type UpdateEmailTemplateInput,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  EMAIL_TEMPLATE_LAYOUT,
  EMAIL_TEMPLATE_VARIABLES,
} from "@/lib/renderer/crm/settings/email-template-layout";
import { requiredText, textOrOmit } from "../shared/record-payload";

/**
 * Create and edit an email template, rendered from the description.
 *
 * One form instead of the two the page used to carry — a create dialog and an
 * edit card, three fields written out twice. The body's variable palette is
 * supplied through `controls`, which is what lets a generated form host a
 * bespoke control for one field without the surface forking the whole form.
 */

interface EmailTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

function TemplateBodyControl({ value, onChange, disabled }: RecordFieldControl) {
  return (
    <div className="flex flex-col gap-gap-field">
      <Textarea
        rows={10}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-col gap-gap-inline">
        <span className="text-micro text-muted-foreground">Insert a variable</span>
        <div className="flex flex-wrap gap-gap-inline">
          {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
            <Button
              key={variable.token}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-micro"
              disabled={disabled}
              onClick={() => onChange(`${value}{{${variable.token}}}`)}
            >
              {variable.token}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmailTemplateSheet({ open, onOpenChange, template }: EmailTemplateSheetProps) {
  const layout = useTenantLayout(EMAIL_TEMPLATE_LAYOUT);
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const isEditing = template !== null;
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  const controls = useMemo(
    () => ({ body: (control: RecordFieldControl) => <TemplateBodyControl {...control} /> }),
    [],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (template) {
      const patch: UpdateEmailTemplateInput = { id: template.id };
      const name = textOrOmit(values, "name");
      if (name !== undefined) patch.name = name;
      const subject = textOrOmit(values, "subject");
      if (subject !== undefined) patch.subject = subject;
      const body = textOrOmit(values, "body");
      if (body !== undefined) patch.body = body;

      updateTemplate.mutate(patch, {
        onSuccess: () => {
          toast.success("Template updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    createTemplate.mutate(
      {
        name: requiredText(values, "name"),
        subject: requiredText(values, "subject"),
        body: requiredText(values, "body"),
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit template" : "New template"}</SheetTitle>
          <SheetDescription>
            A template is an email written once, with the parts that change left as variables.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={template?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={template ? asRecordValue(template) : undefined}
            controls={controls}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create template"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
