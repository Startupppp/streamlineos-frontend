"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { LocationSelect } from "@/components/inventory/location-select";
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
import { useCan } from "@/hooks/api/access";
import {
  SUBSTITUTE_KEY,
  useReportPickException,
  type PickWaveLine,
} from "@/hooks/api/inventory/picking";
import {
  pickExceptionSchema,
  type PickExceptionFormValues,
} from "./pick-exception-schema";

const REVIEWED_REASONS: readonly string[] = ["DAMAGED", "SUBSTITUTED"];

interface PickExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickListId: number;
  warehouseId: number | null;
  line: PickWaveLine | null;
}

export function PickExceptionDialog({
  open,
  onOpenChange,
  pickListId,
  warehouseId,
  line,
}: PickExceptionDialogProps) {
  const report = useReportPickException();
  const canSubstitute = useCan(SUBSTITUTE_KEY);

  function handleSubmit(values: PickExceptionFormValues): void {
    if (!line) return;
    report.mutate(
      {
        pickListId,
        pickLineId: line.id,
        reason: values.reason,
        notes: values.notes,
        foundLocationId: values.foundLocationId
          ? Number(values.foundLocationId)
          : undefined,
        substituteVariantId: values.substituteVariantId
          ? Number(values.substituteVariantId)
          : undefined,
        quantityPicked: values.quantityPicked,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.status === "OPEN" && REVIEWED_REASONS.includes(result.reason)
              ? "Exception recorded — a supervisor has to sign it off"
              : "Exception recorded",
          );
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
                      <SelectItem value="WRONG_LOCATION">
                        Wrong location — they were somewhere else
                      </SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      {canSubstitute ? (
                        <SelectItem value="SUBSTITUTED">Substituted</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {reason === "WRONG_LOCATION" ? (
              <FormField
                control={form.control}
                name="foundLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Where they actually were</FormLabel>
                    <FormControl>
                      <LocationSelect
                        warehouseId={warehouseId ?? undefined}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Pick the bin you found them in…"
                        ariaLabel="Where they actually were"
                      />
                    </FormControl>
                    <FormDescription>
                      Naming the bin retargets this task so you can carry on picking, and
                      leaves the discrepancy on the record for a count to chase.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {reason === "SUBSTITUTED" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="substituteVariantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variant taken instead</FormLabel>
                      <FormControl>
                        
                        <ProductVariantCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          ariaLabel="Variant taken instead"
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
                      <FormDescription>
                        Has to cover the whole line, and the replacement must be sold in
                        the same unit. The order line moves onto it and the reservation
                        moves with it.
                      </FormDescription>
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
