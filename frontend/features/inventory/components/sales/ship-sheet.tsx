"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppSheet } from "@/components/shared/app-sheet";
import { useShipSalesOrder } from "@/hooks/api/inventory/sales-orders";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";

const shipSchema = z.object({
  shipDate: z.string().min(1, "Ship date is required"),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ShipFormValues = z.infer<typeof shipSchema>;

interface ShipSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soId: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ShipSheet({ open, onOpenChange, soId }: ShipSheetProps) {
  const shipMutation = useShipSalesOrder();

  const form = useForm<ShipFormValues>({
    resolver: zodResolver(shipSchema),
    defaultValues: { shipDate: todayIso(), trackingNumber: "", notes: "" },
  });

  function handleSubmit(values: ShipFormValues): void {
    shipMutation.mutate(
      {
        soId,
        shipDate: values.shipDate,
        trackingNumber: values.trackingNumber || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Order shipped");
          form.reset({ shipDate: todayIso(), trackingNumber: "", notes: "" });
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleOpenChange(next: boolean): void {
    if (!next) form.reset({ shipDate: todayIso(), trackingNumber: "", notes: "" });
    onOpenChange(next);
  }

  function handleClose(): void {
    handleOpenChange(false);
  }

  function handlePreventDefault(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
  }

  const footer = (
    <>
      <Button variant="outline" size="sm" type="button" onClick={handleClose}>
        Cancel
      </Button>
      <LoadingButton
        size="sm"
        type="button"
        isPending={shipMutation.isPending}
        loadingText="Shipping…"
        onClick={form.handleSubmit(handleSubmit)}
      >
        Ship Order
      </LoadingButton>
    </>
  );

  return (
    <AppSheet open={open} onOpenChange={handleOpenChange} title="Ship Order" footer={footer}>
      <form className="space-y-4" onSubmit={handlePreventDefault}>
        <div className="space-y-1.5">
          <Label htmlFor="shipDate">Ship Date *</Label>
          <Controller
            name="shipDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker id="shipDate" value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
            )}
          />
          {form.formState.errors.shipDate && (
            <p className="text-xs text-destructive">{form.formState.errors.shipDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trackingNumber">Tracking Number</Label>
          <Input
            id="trackingNumber"
            placeholder="Optional"
            className="text-sm"
            {...form.register("trackingNumber")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Optional"
            className="text-sm min-h-[80px] resize-none"
            {...form.register("notes")}
          />
        </div>
      </form>
    </AppSheet>
  );
}
