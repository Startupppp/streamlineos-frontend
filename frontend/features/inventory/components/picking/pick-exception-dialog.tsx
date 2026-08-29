"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReportPickException, type PickWaveLine } from "@/hooks/api/inventory/picking";
import {
  pickExceptionSchema,
  type PickExceptionFormValues,
} from "./pick-exception-schema";

interface PickExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickListId: number;
  line: PickWaveLine | null;
}

/**
 * Why a line could not close as asked.
 *
 * A short pick with no reason and a short pick because the shelf was empty carry
 * the same quantity and different meanings — the first is a process problem and
 * the second is a stock problem, and a warehouse that cannot tell them apart
 * fixes neither. It is also what lets a picker holding an incomplete tote close
 * the wave at all.
 */
export function PickExceptionDialog({
  open,
  onOpenChange,
  pickListId,
  line,
}: PickExceptionDialogProps) {
  const report = useReportPickException();

  function handleSubmit(values: PickExceptionFormValues): void {
    if (!line) return;
    report.mutate(
      {
        pickListId,
        pickLineId: line.id,
        reason: values.reason,
        notes: values.notes,
        substituteVariantId: values.substituteVariantId
          ? Number(values.substituteVariantId)
          : undefined,
        quantityPicked: values.quantityPicked,
      },
      {
        onSuccess: () => {
          toast.success("Exception recorded");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <EntityFormDialog<PickExceptionFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Report an exception"
      description={
        line
          ? `${line.sku} — ${line.quantity_picked} of ${line.quantity_to_pick} picked`
          : undefined
      }
      resolver={zodResolver(pickExceptionSchema)}
      defaultValues={{ reason: "SHORT", notes: "" }}
      onSubmit={handleSubmit}
      isSubmitting={report.isPending}
      submitLabel="Record exception"
      resetOnOpen
    >
      {(form) => {
        const reason = form.watch("reason");
        return (
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Why is the line short?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      <SelectItem value="SHORT">Short — fewer on the shelf</SelectItem>
                      <SelectItem value="NOT_FOUND">Not found — bin empty</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="SUBSTITUTED">Substituted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {reason === "SUBSTITUTED" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="substituteVariantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variant taken instead</FormLabel>
                      <FormControl>
                        {/* A picker rather than an id box: the substitute has to
                            be a live, sellable variant, and nobody at a shelf
                            knows a variant's primary key. */}
                        <ProductVariantCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantityPicked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity taken</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="0.0000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="What did you see at the shelf?"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      }}
    </EntityFormDialog>
  );
}
