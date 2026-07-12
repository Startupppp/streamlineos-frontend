"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateVendorCredit } from "@/hooks/api/accounting/ap";
import { useVendorsOutstanding } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

const lineSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.string().min(1, "Required"),
  rate: z.string().min(1, "Required"),
  gstRate: z.string().min(1, "Required"),
});

const vendorCreditFormSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  reason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, "At least one item required"),
});

type VendorCreditFormValues = z.infer<typeof vendorCreditFormSchema>;

const EMPTY_LINE = { description: "", quantity: "", rate: "", gstRate: "" };

interface VendorCreditFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorCreditFormSheet({ open, onOpenChange }: VendorCreditFormSheetProps) {
  const createMutation = useCreateVendorCredit();
  const vendorsQuery = useVendorsOutstanding({ pageSize: 100 });

  const form = useForm<VendorCreditFormValues>({
    resolver: zodResolver(vendorCreditFormSchema),
    defaultValues: { vendorId: "", reason: "", notes: "", items: [EMPTY_LINE] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  function handleSubmit(values: VendorCreditFormValues): void {
    createMutation.mutate(
      {
        vendorId: Number(values.vendorId),
        reason: values.reason || undefined,
        notes: values.notes || undefined,
        items: values.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          gstRate: Number(it.gstRate),
        })),
      },
      {
        onSuccess: () => {
          toast.success("Vendor credit created");
          onOpenChange(false);
          form.reset({ vendorId: "", reason: "", notes: "", items: [EMPTY_LINE] });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleAddLine(): void {
    append(EMPTY_LINE);
  }

  function handleRemoveLine(index: number): void {
    remove(index);
  }

  function handleCancel(): void {
    onOpenChange(false);
  }

  const vendors = vendorsQuery.data?.items ?? [];

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Vendor Credit"
      description="Record a debit note or credit memo from a vendor."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
            onClick={form.handleSubmit(handleSubmit)}
          >
            Create
          </LoadingButton>
        </div>
      }
    >
      <form className="flex flex-col gap-4 px-6 py-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-1.5">
          <Label className="text-xs">Vendor</Label>
          <Controller
            control={form.control}
            name="vendorId"
            render={({ field, fieldState }) => (
              <>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select vendor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                        {v.vendorName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Reason</Label>
          <Input
            {...form.register("reason")}
            className="h-8 text-sm"
            placeholder="e.g. Returned goods, pricing error…"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <textarea
            {...form.register("notes")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[64px] resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Internal notes…"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Line items</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="h-3 w-3 mr-1" />
              Add line
            </Button>
          </div>
          {form.formState.errors.items?.root && (
            <p className="text-xs text-destructive">{form.formState.errors.items.root.message}</p>
          )}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-16">Qty</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-20">Rate</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-16">GST %</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-1">
                      <Input
                        {...form.register(`items.${idx}.description`)}
                        className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        {...form.register(`items.${idx}.quantity`)}
                        className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-0 px-0"
                        placeholder="1"
                        type="number"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        {...form.register(`items.${idx}.rate`)}
                        className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-0 px-0"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Controller
                        control={form.control}
                        name={`items.${idx}.gstRate`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="h-7 text-xs border-0 shadow-none focus:ring-0">
                              <SelectValue placeholder="0" />
                            </SelectTrigger>
                            <SelectContent>
                              {["0", "5", "12", "18", "28"].map((r) => (
                                <SelectItem key={r} value={r}>{r}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </AppSheet>
  );
}
