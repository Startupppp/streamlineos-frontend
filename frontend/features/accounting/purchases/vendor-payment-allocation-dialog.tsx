"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePurchaseBills } from "@/hooks/api/accounting";
import { useCreateVendorPaymentAllocation } from "@/hooks/api/accounting/ap";

interface VendorPaymentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const allocationSchema = z.object({
  vendorPaymentId: z.string().min(1, "Required"),
  billId: z.string().min(1, "Select a bill"),
  amount: z.string().min(1, "Required"),
});

type AllocationFormValues = z.infer<typeof allocationSchema>;

export function VendorPaymentAllocationDialog({
  open,
  onOpenChange,
}: VendorPaymentAllocationDialogProps) {
  const allocateMutation = useCreateVendorPaymentAllocation();
  const billsQuery = usePurchaseBills({ status: "POSTED", pageSize: 50 });

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { vendorPaymentId: "", billId: "", amount: "" },
  });

  function handleAllocate(values: AllocationFormValues): void {
    allocateMutation.mutate(
      {
        vendorPaymentId: Number(values.vendorPaymentId),
        allocations: [{ billId: Number(values.billId), amount: Number(values.amount) }],
      },
      {
        onSuccess: () => {
          toast.success("Allocation recorded");
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const bills = billsQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment Allocation</DialogTitle>
          <DialogDescription>Link an existing vendor payment to a bill</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleAllocate)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vendorPaymentId" className="text-xs font-medium">
              Vendor Payment ID
            </Label>
            <Input
              id="vendorPaymentId"
              type="number"
              min="1"
              placeholder="e.g. 42"
              className="text-sm"
              {...form.register("vendorPaymentId")}
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the vendor payment ID from the payment record.
            </p>
            {form.formState.errors.vendorPaymentId && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.vendorPaymentId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bill</Label>
            <Controller
              control={form.control}
              name="billId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill) => (
                      <SelectItem key={bill.id} value={String(bill.id)}>
                        {bill.billNumber} · {bill.vendorName ?? "Unknown"} · {Number(bill.total).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.billId && (
              <p className="text-[11px] text-destructive">{form.formState.errors.billId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="text-sm"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-[11px] text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <LoadingButton type="submit" size="sm" isPending={allocateMutation.isPending}>
              Allocate
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
