"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AppSheet } from "@/components/shared/app-sheet";
import { usePickSalesOrder, useWarehouses, useLocations } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { decimalQuantityOrZeroSchema } from "@/features/inventory/lib/quantity-schema";

const pickSchema = z.object({
  warehouseId: z.number().int().min(1, "Select a warehouse"),
  locationId: z.number().int().min(1, "Select a location"),
  lines: z.array(
    z.object({
      soLineId: z.number().int(),
      quantityPicked: decimalQuantityOrZeroSchema,
    }),
  ),
});

type PickFormValues = z.infer<typeof pickSchema>;

interface SoLine {
  id: number;
  productName: string | null;
  quantity: string;
}

interface PickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soId: number;
  lines: SoLine[];
}

function buildDefaultLines(lines: SoLine[]): PickFormValues["lines"] {
  return lines.map((l) => ({ soLineId: l.id, quantityPicked: Number(l.quantity).toFixed(4) }));
}

export function PickSheet({ open, onOpenChange, soId, lines }: PickSheetProps) {
  const pickMutation = usePickSalesOrder();
  const warehousesQuery = useWarehouses();

  const form = useForm<PickFormValues>({
    resolver: zodResolver(pickSchema),
    defaultValues: { warehouseId: 0, locationId: 0, lines: buildDefaultLines(lines) },
  });

  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  const watchedWarehouseId = useWatch({ control: form.control, name: "warehouseId" });
  const locationsQuery = useLocations(watchedWarehouseId);

  const warehouses = warehousesQuery.data?.items ?? [];
  const locations = locationsQuery.data ?? [];

  function handleSubmit(values: PickFormValues): void {
    pickMutation.mutate(
      {
        soId,
        lines: values.lines.map((l) => ({
          soLineId: l.soLineId,
          locationId: values.locationId,
          quantityPicked: l.quantityPicked,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Order picked");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleOpenChange(next: boolean): void {
    if (!next) {
      form.reset({ warehouseId: 0, locationId: 0, lines: buildDefaultLines(lines) });
    }
    onOpenChange(next);
  }

  function handleClose(): void {
    handleOpenChange(false);
  }

  function handleWarehouseChange(val: string, fieldOnChange: (v: number) => void): void {
    fieldOnChange(Number(val));
    form.setValue("locationId", 0);
  }

  const footer = (
    <>
      <Button variant="outline" size="sm" type="button" onClick={handleClose}>
        Cancel
      </Button>
      <LoadingButton
        size="sm"
        type="button"
        isPending={pickMutation.isPending}
        loadingText="Picking…"
        onClick={form.handleSubmit(handleSubmit)}
      >
        Confirm Pick
      </LoadingButton>
    </>
  );

  return (
    <AppSheet open={open} onOpenChange={handleOpenChange} title="Pick Order" footer={footer}>
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => handleWarehouseChange(val, field.onChange)}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
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
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                    disabled={!watchedWarehouseId}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lines</p>
            <div className="rounded border divide-y divide-border">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_96px] gap-2 items-center px-3 py-2"
                >
                  <TruncatedText text={lines[idx]?.productName ?? "—"} className="text-xs" />
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    className="text-xs text-right"
                    {...form.register(`lines.${idx}.quantityPicked`)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Form>
    </AppSheet>
  );
}
