"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  approveReturnSchema,
  type ApproveReturnFormValues,
} from "./return-approve-schema";

export interface ReturnApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnNumber: string;
  isSubmitting: boolean;
  onApprove: (creditReference: string | undefined) => void;
}

/**
 * B9, item 1. The sign-off, as its own confirmed step rather than a side effect
 * of posting.
 *
 * One field, so rung 3 of the overlay ladder (§13): a Dialog, not a Sheet.
 */
export function ReturnApproveDialog({
  open,
  onOpenChange,
  returnNumber,
  isSubmitting,
  onApprove,
}: ReturnApproveDialogProps) {
  function handleSubmit(values: ApproveReturnFormValues): void {
    const reference = values.creditReference?.trim();
    onApprove(reference ? reference : undefined);
  }

  return (
    <EntityFormDialog<ApproveReturnFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={`Approve ${returnNumber}`}
      description="Approving accepts the inspection. The goods move when the return is posted."
      resolver={zodResolver(approveReturnSchema)}
      defaultValues={{ creditReference: "" }}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Approve return"
      resetOnOpen
    >
      {(form) => (
        <FormField
          control={form.control}
          name="creditReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit or refund reference</FormLabel>
              <FormControl>
                <Input placeholder="e.g. CN-2026-0007" {...field} />
              </FormControl>
              <FormDescription>
                Optional. A pointer at the credit note raised elsewhere — the stock posts
                either way.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
