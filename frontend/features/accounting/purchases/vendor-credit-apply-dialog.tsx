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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplyVendorCredit } from "@/hooks/api/accounting/ap";
import { usePurchaseBills } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

const applySchema = z.object({
  billId: z.string().min(1, "Select a bill"),
  amount: z.string().min(1, "Required"),
});

type ApplyFormValues = z.infer<typeof applySchema>;

interface VendorCreditApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditId: number;
  vendorId: number | null;
  remaining: number;
}

export function VendorCreditApplyDialog({
  open,
  onOpenChange,
  creditId,
  vendorId,
  remaining,
}: VendorCreditApplyDialogProps) {
  const applyMutation = useApplyVendorCredit(creditId);

  const billsQuery = usePurchaseBills({
    vendorId: vendorId ?? undefined,
    status: "POSTED",
    limit: 50,
  });

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: { billId: "", amount: "" },
  });

  function handleSubmit(values: ApplyFormValues): void {
    applyMutation.mutate(
      { billId: Number(values.billId), amount: Number(values.amount) },
      {
        onSuccess: () => {
          toast.success("Credit applied to bill");
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleCancel(): void {
    onOpenChange(false);
    form.reset();
  }

  const bills = billsQuery.data?.data ?? [];

  function handleRetryBills(): void {
    void billsQuery.refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Vendor Credit</DialogTitle>
          <DialogDescription>
            Apply this credit to an outstanding bill. Available: ₹{remaining.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        {/*
          Without this branch a failed bill read rendered as an empty selector,
          which the user reads as "this vendor has no outstanding bills" — a
          claim about the ledger made out of a failed request.
        */}
        {billsQuery.isError ? (
          <ErrorState
            compact
            title="Couldn't load bills"
            description={getErrorMessage(billsQuery.error)}
            onRetry={handleRetryBills}
          />
        ) : (
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-1.5">
            <Label className="text-xs">Bill (Posted) <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="billId"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select bill…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bills.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.billNumber} — ₹{Number(b.total).toFixed(2)}
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
            <Label className="text-xs">Amount to apply <span className="text-destructive">*</span></Label>
            <Input
              {...form.register("amount")}
              className="text-sm"
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              placeholder={`Max ${remaining.toFixed(2)}`}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </form>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          {!billsQuery.isError && (
            <LoadingButton
              size="sm"
              isPending={applyMutation.isPending}
              loadingText="Applying…"
              onClick={form.handleSubmit(handleSubmit)}
            >
              Apply
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
