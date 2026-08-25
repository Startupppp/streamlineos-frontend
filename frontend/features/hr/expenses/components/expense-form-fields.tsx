"use client";

import { useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { type ExpenseFormData } from "./expense-form-schema";
import { MAX_EXPENSE_RECEIPTS, type ExpenseReceipt } from "../expense-constants";
import { ReceiptManager, type PendingReceipt } from "./receipt-manager";

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(value ? String(value) : "");
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDisplay(value ? String(value) : "");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d{0,12}(\.\d{0,2})?$/.test(raw)) {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 999_999_999.99) return;
      setDisplay(raw);
      onChange(isNaN(num) ? 0 : num);
    }
  };

  const handleBlur = () => {
    const num = parseFloat(display);
    if (!isNaN(num) && num > 0) {
      setDisplay(num % 1 === 0 ? String(num) : num.toFixed(2));
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="0.00"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className="text-right font-semibold"
    />
  );
}

interface ExpenseFormFieldsProps {
  form: UseFormReturn<ExpenseFormData>;
  categories: string[];
  paymentMethods: string[];
  existingReceipts: ExpenseReceipt[];
  pendingReceipts: PendingReceipt[];
  onAddPendingReceipts: (receipts: PendingReceipt[]) => void;
  onRemoveExistingReceipt: (index: number) => void;
  onRemovePendingReceipt: (id: string) => void;
}

export function ExpenseFormFields({
  form,
  categories,
  paymentMethods,
  existingReceipts,
  pendingReceipts,
  onAddPendingReceipts,
  onRemoveExistingReceipt,
  onRemovePendingReceipt,
}: ExpenseFormFieldsProps) {
  const totalReceipts = existingReceipts.length + pendingReceipts.length;

  const handleCategoryChange = (value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    if (value !== "Other") {
      form.setValue("customCategory", "");
      form.clearErrors("customCategory");
    }
  };

  const handlePaymentMethodChange = (value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    if (value !== "Other") {
      form.setValue("customPaymentMethod", "");
      form.clearErrors("customPaymentMethod");
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Category <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  onValueChange={(value) => handleCategoryChange(value, field.onChange)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Amount (₹) <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <AmountInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.watch("category") === "Other" && (
          <FormField
            control={form.control}
            name="customCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  What is the other category? <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-sm"
                    placeholder="e.g. Client entertainment, Team offsite"
                    {...field}
                  />
                </FormControl>
                <p className="text-dense text-muted-foreground">
                  Letters, numbers, spaces, apostrophes, periods, and hyphens only.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  Date <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    toDate={new Date()}
                    placeholder="Pick date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Payment Method</FormLabel>
                <Select
                  onValueChange={(value) => handlePaymentMethodChange(value, field.onChange)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.watch("paymentMethod") === "Other" && (
          <FormField
            control={form.control}
            name="customPaymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  What is the other payment method? <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-sm"
                    placeholder="e.g. Petty cash, Wire transfer"
                    {...field}
                  />
                </FormControl>
                <p className="text-dense text-muted-foreground">
                  Letters, numbers, spaces, apostrophes, periods, and hyphens only.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Merchant / Vendor</FormLabel>
              <FormControl>
                <Input
                  className="text-sm"
                  placeholder="e.g. Amazon, Uber, Hotel Taj"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Description</FormLabel>
              <FormControl>
                <Textarea
                  className="text-sm resize-none"
                  placeholder="Brief description..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium">
              Receipts
              {totalReceipts > 0 && (
                <span className="ml-1 text-muted-foreground font-normal">
                  ({totalReceipts}/{MAX_EXPENSE_RECEIPTS})
                </span>
              )}
            </label>
          </div>
          <ReceiptManager
            existingReceipts={existingReceipts}
            pendingReceipts={pendingReceipts}
            onAddPending={onAddPendingReceipts}
            onRemoveExisting={onRemoveExistingReceipt}
            onRemovePending={onRemovePendingReceipt}
          />
        </div>
      </div>
    </Form>
  );
}
