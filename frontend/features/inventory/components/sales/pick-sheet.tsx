"use client";

import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSheet } from "@/components/shared/app-sheet";
import { usePickSalesOrder, useWarehouses, useLocations } from "@/hooks/api/inventory";

const pickSchema = z.object({
  warehouseId: z.number().int().min(1, "Select a warehouse"),
  locationId: z.number().int().min(1, "Select a location"),
  lines: z.array(
    z.object({
      soLineId: z.number().int(),
      quantityPicked: z.number().min(0, "Must be 0 or more"),
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
  return lines.map((l) => ({ soLineId: l.id, quantityPicked: Number(l.quantity) }));
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

  const warehouses = warehousesQuery.data ?? [];
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
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleOpenChange(next: boolean): void {
    if (!next) {
      form.reset({ warehouseId: 0, locationId: 0, lines: buildDefaultLines(lines) });
    }
    onOpenChange(next);
  }

  function handleWarehouseChange(val: string, fieldOnChange: (v: number) => void): void {
    fieldOnChange(Number(val));
    form.setValue("locationId", 0);
  }

  const footer = (
    <>
      <Button variant="outline" size="sm" type="button" onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
      <Button
        size="sm"
        type="button"
        disabled={pickMutation.isPending}
        onClick={form.handleSubmit(handleSubmit)}
      >
        {pickMutation.isPending ? "Picking…" : "Confirm Pick"}
      </Button>
    </>
  );

  return (
    <AppSheet open={open} onOpenChange={handleOpenChange} title="Pick Order" footer={footer}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Controller
              name="warehouseId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => handleWarehouseChange(val, field.onChange)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.warehouseId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.warehouseId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Controller
              name="locationId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => field.onChange(Number(val))}
                  disabled={!watchedWarehouseId}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.locationId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.locationId.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lines</p>
          <div className="rounded border divide-y divide-border">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_96px] gap-2 items-center px-3 py-2"
              >
                <span className="text-xs truncate">{lines[idx]?.productName ?? "—"}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  className="h-8 text-xs text-right"
                  {...form.register(`lines.${idx}.quantityPicked`, { valueAsNumber: true })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppSheet>
  );
}
