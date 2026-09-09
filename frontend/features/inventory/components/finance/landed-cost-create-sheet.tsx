"use client";

import { useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { EntityFormSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGoodsReceipts } from "@/hooks/api/inventory/operations";
import {
  LANDED_COST_CHARGE_TYPES,
  useCreateLandedCostVoucher,
} from "@/hooks/api/inventory/landed-cost";
import {
  createLandedCostVoucherFormSchema,
  toMinorUnits,
  type CreateLandedCostVoucherFormOutput,
  type CreateLandedCostVoucherFormValues,
} from "./landed-cost-schema";

const CHARGE_TYPE_LABEL: Record<(typeof LANDED_COST_CHARGE_TYPES)[number], string> = {
  FREIGHT: "Freight",
  DUTY: "Duty",
  INSURANCE: "Insurance",
  HANDLING: "Handling",
  OTHER: "Other",
};

/**
 * Raising a voucher against a receipt.
 *
 * The receipt is chosen by its number, never by its id: the picker lists posted
 * and open receipts by `grnNumber` and sends the id behind the scenes.
 */
export function LandedCostCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateLandedCostVoucher();
  const { data: receipts, isLoading: receiptsLoading } = useGoodsReceipts({ pageSize: 100 });

  function handleSubmit(values: CreateLandedCostVoucherFormOutput): void {
    create.mutate(
      {
        grnId: Number(values.grnId),
        allocationBasis: values.allocationBasis,
        currency: values.currency.toUpperCase(),
        notes: values.notes === "" ? undefined : values.notes,
        charges: values.charges.map((charge) => ({
          chargeType: charge.chargeType,
          description: charge.description,
          amountCents: toMinorUnits(charge.amount),
          reference: charge.reference === "" ? undefined : charge.reference,
        })),
      },
      {
        onSuccess: (voucher) => {
          toast.success(`Voucher ${voucher.voucherNumber} raised as a draft.`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<CreateLandedCostVoucherFormValues, CreateLandedCostVoucherFormOutput>
      open={open}
      onOpenChange={onOpenChange}
      title="Raise a landed-cost voucher"
      description="Freight, duty, insurance and handling for one receipt. The voucher is a draft until it is applied; applying it restates what the goods cost."
      resolver={zodResolver(createLandedCostVoucherFormSchema)}
      resetOnOpen
      className="sm:max-w-2xl"
      defaultValues={{
        grnId: "",
        allocationBasis: "VALUE",
        currency: "INR",
        notes: "",
        charges: [{ chargeType: "FREIGHT", description: "", amount: "", reference: "" }],
      }}
      isSubmitting={create.isPending}
      submitLabel={create.isPending ? "Raising…" : "Raise voucher"}
      onSubmit={handleSubmit}
    >
      {(form) => <LandedCostFields form={form} receipts={receipts?.items} loading={receiptsLoading} />}
    </EntityFormSheet>
  );
}

type FormApi = Parameters<
  Parameters<
    typeof EntityFormSheet<CreateLandedCostVoucherFormValues, CreateLandedCostVoucherFormOutput>
  >[0]["children"]
>[0];

function LandedCostFields({
  form,
  receipts,
  loading,
}: {
  form: FormApi;
  receipts: Array<{ id: number; grnNumber: string; status: string }> | undefined;
  loading: boolean;
}) {
  const charges = useFieldArray({ control: form.control, name: "charges" });

  function handleAddCharge(): void {
    charges.append({ chargeType: "OTHER", description: "", amount: "", reference: "" });
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="grnId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Goods receipt</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading receipts…" : "Choose a receipt"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(receipts ?? []).map((receipt) => (
                  <SelectItem key={receipt.id} value={String(receipt.id)}>
                    {receipt.grnNumber} ({receipt.status.toLowerCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="allocationBasis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spread across layers by</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="VALUE">What each layer was worth</SelectItem>
                  <SelectItem value="QUANTITY">How many units it holds</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-dense text-muted-foreground">
                Duty is assessed on value; pallet handling is not.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input {...field} maxLength={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Charges</p>
          <Button type="button" variant="outline" size="sm" onClick={handleAddCharge}>
            Add charge
          </Button>
        </div>

        {charges.fields.map((chargeField, index) => (
          <div key={chargeField.id} className="rounded-xl border border-border p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[9rem_1fr_8rem]">
              <FormField
                control={form.control}
                name={`charges.${index}.chargeType`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                name={`charges.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Road freight, Chennai to Hyderabad" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`charges.${index}.amount`}
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
            </div>
            {charges.fields.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-7"
                onClick={() => charges.remove(index)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
