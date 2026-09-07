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
import {
  useCreatePricebook,
  useUpdatePricebook,
  type CreatePricebookInput,
} from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRICEBOOK_LAYOUT } from "@/lib/renderer/crm/settings/pricebook-layout";
import type { Pricebook } from "@/types/crm/pricebooks";
import { flagOr, flagOrOmit, requiredText, textOrNull, textOrOmit } from "../shared/record-payload";

interface PricebookSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricebook: Pricebook | null;
}

interface PricebookPatch {
  id: string;
  name?: string;
  description?: string | null;
  currency?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Create and edit a pricebook, rendered from the description.
 *
 * The two flags are described as two-state badges rather than switches, so the
 * list and the form say the same word for the same state — a row reading
 * "Default" and a form reading "Set as default pricebook" were the same fact
 * under two names.
 */
export function PricebookSheet({ open, onOpenChange, pricebook }: PricebookSheetProps) {
  const layout = useTenantLayout(PRICEBOOK_LAYOUT);
  const createPricebook = useCreatePricebook();
  const updatePricebook = useUpdatePricebook();
  const isEditing = pricebook !== null;
  const isPending = createPricebook.isPending || updatePricebook.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (pricebook) {
      const patch: PricebookPatch = { id: pricebook.id };
      const name = textOrOmit(values, "name");
      if (name !== undefined) patch.name = name;
      const description = textOrNull(values, "description");
      if (description !== undefined) patch.description = description;
      const currency = textOrOmit(values, "currency");
      if (currency !== undefined) patch.currency = currency.toUpperCase();
      const isDefault = flagOrOmit(values, "isDefault");
      if (isDefault !== undefined) patch.isDefault = isDefault;
      const isActive = flagOrOmit(values, "isActive");
      if (isActive !== undefined) patch.isActive = isActive;

      updatePricebook.mutate(patch, {
        onSuccess: () => {
          toast.success("Pricebook updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    const payload: CreatePricebookInput = {
      name: requiredText(values, "name"),
      currency: requiredText(values, "currency").toUpperCase(),
      description: textOrOmit(values, "description"),
      isDefault: flagOr(values, "isDefault", false),
      isActive: flagOr(values, "isActive", true),
    };

    createPricebook.mutate(payload, {
      onSuccess: () => {
        toast.success("Pricebook created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit pricebook" : "New pricebook"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update what this pricebook is called and where it applies."
              : "A pricebook is one set of prices — a segment, a region, a reseller tier."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={pricebook?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={
              pricebook
                ? asRecordValue(pricebook)
                : { currency: "INR", isDefault: "false", isActive: "true" }
            }
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create pricebook"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
