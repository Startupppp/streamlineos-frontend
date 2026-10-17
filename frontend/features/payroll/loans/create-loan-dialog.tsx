"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useCreateAdminLoan } from "@/hooks/api/payroll/loans-admin";
import { createLoanFormSchema, type CreateLoanValues } from "./create-loan-schema";

const DEFAULTS: CreateLoanValues = { userId: "", amount: "", totalEmis: "12", reason: "" };

interface CreateLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLoanDialog({ open, onOpenChange }: CreateLoanDialogProps) {
  const createLoan = useCreateAdminLoan();
  const form = useForm<CreateLoanValues>({
    resolver: zodResolver(createLoanFormSchema),
    defaultValues: DEFAULTS,
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(DEFAULTS);
    onOpenChange(next);
  }

  const amount = Number(form.watch("amount"));
  const emis = Number(form.watch("totalEmis"));
  const emiPreview = amount > 0 && Number.isInteger(emis) && emis > 0 ? amount / emis : null;

  const handleSubmit = form.handleSubmit((values) => {
    createLoan.mutate(
      {
        userId: values.userId,
        amount: Number(values.amount),
        totalEmis: Number(values.totalEmis),
        reason: values.reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Loan created — pending approval");
          handleOpenChange(false);
        },
        onError: (err) => form.setError("root", { message: getErrorMessage(err) }),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New loan or advance</DialogTitle>
          <DialogDescription>
            The loan starts as pending. Once approved and active, one EMI is recovered in each
            payroll run.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Employee <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <UserCombobox value={field.value} onChange={field.onChange} placeholder="Select employee" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="1000" step="1" placeholder="50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalEmis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Number of EMIs <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="360" step="1" {...field} />
                  </FormControl>
                  {emiPreview !== null && (
                    <p className="text-xs text-muted-foreground">
                      EMI: {formatMoney(emiPreview.toFixed(2))} per payroll run
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Salary advance for relocation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.message && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={createLoan.isPending} loadingText="Creating…">
                Create loan
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
