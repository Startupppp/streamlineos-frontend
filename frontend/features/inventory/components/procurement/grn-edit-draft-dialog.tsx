"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { DatePicker } from "@/components/ui/date-picker";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateGrnDraft } from "@/hooks/api/inventory/operations";
import {
  grnDraftEditSchema,
  type GrnDraftEditFormOutput,
  type GrnDraftEditFormValues,
} from "./grn-edit-schema";

interface GrnEditDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grnId: number;
  grnNumber: string;
  receivedDate: string;
  notes: string | null;
}

/**
 * Correcting the header of a receipt that has not posted yet.
 *
 * `receive-goods-sheet.tsx` stamps `receivedDate: getTodayString()` and offers
 * no field for it, so a delivery keyed the next morning — a Friday evening
 * pallet booked in on Monday — carries the wrong date from the moment it is
 * raised. `PATCH /inventory/goods-receipts/:grnId` accepted a correction the
 * whole time, carried `inventory:purchase-orders:receive`, and
 * `useUpdateGrnDraft` was referenced by nothing. The date is not decoration: it
 * is what the receipt is reconciled against.
 *
 * Offered on DRAFT and COUNTING because those are the two the service calls
 * EDITABLE. Anything later has moved stock, and the correction for that is a
 * reversal rather than an edit.
 */
export function GrnEditDraftDialog({
  open,
  onOpenChange,
  grnId,
  grnNumber,
  receivedDate,
  notes,
}: GrnEditDraftDialogProps) {
  const update = useUpdateGrnDraft();

  function handleSubmit(values: GrnDraftEditFormOutput): void {
    update.mutate(
      {
        grnId,
        receivedDate: values.receivedDate,
        notes: values.notes === "" ? undefined : values.notes,
      },
      {
        onSuccess: () => {
          toast.success(`GRN ${grnNumber} updated.`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<GrnDraftEditFormValues, GrnDraftEditFormOutput>
      open={open}
      onOpenChange={onOpenChange}
      title="Correct this receipt"
      description={`${grnNumber} has not posted, so its date and notes can still be put right.`}
      resolver={zodResolver(grnDraftEditSchema)}
      resetOnOpen
      defaultValues={{ receivedDate, notes: notes ?? "" }}
      isSubmitting={update.isPending}
      submitLabel={update.isPending ? "Saving…" : "Save changes"}
      onSubmit={handleSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="receivedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received date</FormLabel>
                <FormControl>
                  <DatePicker
                    id={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    dateFormat="dd MMM yyyy"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    placeholder="Pallet damaged in transit, driver noted it on the docket"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
