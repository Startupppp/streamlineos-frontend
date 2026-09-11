"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCreateQuoteTemplate, useUpdateQuoteTemplate } from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { QUOTE_TEMPLATE_LAYOUT } from "@/lib/renderer/crm/settings/quote-template-layout";
import type { QuoteTemplate } from "@/types/crm/pricebooks";
import { flagOr, flagOrOmit, requiredText, textOrOmit } from "../shared/record-payload";

interface QuoteTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: QuoteTemplate | null;
}

interface TemplatePatch {
  id: string;
  name?: string;
  isDefault?: boolean;
  terms?: string;
}

/** Create and edit a quote template, rendered from the description. */
export function QuoteTemplateSheet({ open, onOpenChange, template }: QuoteTemplateSheetProps) {
  const layout = useTenantLayout(QUOTE_TEMPLATE_LAYOUT);
  const createTemplate = useCreateQuoteTemplate();
  const updateTemplate = useUpdateQuoteTemplate();
  const isEditing = template !== null;
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (template) {
      const patch: TemplatePatch = { id: template.id };
      const name = textOrOmit(values, "name");
      if (name !== undefined) patch.name = name;
      const terms = textOrOmit(values, "terms");
      if (terms !== undefined) patch.terms = terms;
      const isDefault = flagOrOmit(values, "isDefault");
      if (isDefault !== undefined) patch.isDefault = isDefault;

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
        isDefault: flagOr(values, "isDefault", false),
        terms: textOrOmit(values, "terms"),
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit template" : "New template"}</SheetTitle>
          <SheetDescription>
            A template is the document a quote is rendered into — your terms, at the foot of every
            page.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={template?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={template ? asRecordValue(template) : { isDefault: "false" }}
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
