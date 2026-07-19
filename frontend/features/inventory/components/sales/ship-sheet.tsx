"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { AppSheet } from "@/components/shared/app-sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
      <Form {...form}>
        <form className="space-y-4" onSubmit={handlePreventDefault}>
          <FormField
            control={form.control}
            name="shipDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ship Date <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="trackingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" className="text-sm" {...field} />
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
                  <Textarea placeholder="Optional" className="text-sm min-h-[80px] resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
