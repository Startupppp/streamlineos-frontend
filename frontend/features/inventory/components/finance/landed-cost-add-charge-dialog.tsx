"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  LANDED_COST_CHARGE_TYPES,
  useAddLandedCostCharge,
} from "@/hooks/api/inventory/landed-cost";
import {
  CHARGE_TYPE_LABEL,
  landedCostChargeSchema,
  toMinorUnits,
  type LandedCostChargeFormOutput,
  type LandedCostChargeFormValues,
} from "./landed-cost-schema";

interface LandedCostAddChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: number | null;
  voucherNumber: string | undefined;
}

export function LandedCostAddChargeDialog({
  open,
  onOpenChange,
  voucherId,
  voucherNumber,
}: LandedCostAddChargeDialogProps) {
  const addCharge = useAddLandedCostCharge();

  function handleSubmit(values: LandedCostChargeFormOutput): void {
    if (voucherId === null) return;
    addCharge.mutate(
      {
        voucherId,
        chargeType: values.chargeType,
        description: values.description,
        amountCents: toMinorUnits(values.amount),
        reference: values.reference === "" ? undefined : values.reference,
      },
      {
        onSuccess: () => {
          toast.success(`${CHARGE_TYPE_LABEL[values.chargeType]} charge added.`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<LandedCostChargeFormValues, LandedCostChargeFormOutput>
      open={open}
      onOpenChange={onOpenChange}
      title="Add a charge"
      description={
        voucherNumber
          ? `Goes onto ${voucherNumber}, which stays a draft until it is applied.`
          : undefined
      }
      resolver={zodResolver(landedCostChargeSchema)}
      resetOnOpen
      defaultValues={{ chargeType: "FREIGHT", description: "", amount: "", reference: "" }}
      isSubmitting={addCharge.isPending}
      submitLabel={addCharge.isPending ? "Adding…" : "Add charge"}
      onSubmit={handleSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="chargeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {LANDED_COST_CHARGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CHARGE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input {...field} placeholder="Customs duty, bill of entry 4471" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="1250.75" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Invoice number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </EntityFormDialog>
  );
}
