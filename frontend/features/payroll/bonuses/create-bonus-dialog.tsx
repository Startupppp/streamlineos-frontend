"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { useCreateBonus } from "@/hooks/api/payroll/bonuses-admin";
import {
  createBonusSchema,
  type CreateBonusValues,
  getCurrentMonth,
  CREATE_TYPE_OPTIONS,
} from "./bonus-schema";

interface CreateBonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBonusDialog({ open, onOpenChange }: CreateBonusDialogProps) {
  const createBonus = useCreateBonus();

  const form = useForm<CreateBonusValues>({
    resolver: zodResolver(createBonusSchema),
    defaultValues: {
      userId: "",
      type: "PERFORMANCE",
      amount: "",
      month: getCurrentMonth(),
      reason: "",
      taxable: true,
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleTaxableChange(checked: boolean) {
    form.setValue("taxable", checked);
  }

  const handleSubmit = form.handleSubmit((values) => {
    createBonus.mutate(
      {
        userId: values.userId,
        type: values.type,
        amount: parseFloat(values.amount),
        month: values.month,
        reason: values.reason || undefined,
        taxable: values.taxable,
      },
      {
        onSuccess: () => {
          toast.success("Bonus created");
          form.reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Bonus</DialogTitle>
          <DialogDescription>
            Add a one-time bonus for an employee. Approved bonuses are included in the selected
            month&apos;s payroll run.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Employee <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select employee"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonus Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATE_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Payroll Month <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      yearRange={[-1, 1]}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief reason for this bonus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleTaxableChange}
                        id="taxable-switch"
                      />
                    </FormControl>
                    <Label htmlFor="taxable-switch" className="cursor-pointer text-sm font-medium">
                      Taxable
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={createBonus.isPending}
                loadingText="Creating…"
              >
                Create Bonus
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
