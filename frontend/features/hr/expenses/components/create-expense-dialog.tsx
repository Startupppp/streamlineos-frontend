"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import Image from "next/image";
import { Upload, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
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
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { useCreateExpense, useUpdateExpense } from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  MAX_EXPENSE_RECEIPTS,
  MAX_EXPENSE_RECEIPT_BYTES,
  parseExpenseReceipts,
  serializeExpenseReceipts,
  getReceiptFileKind,
  receiptKindEmoji,
  receiptKindLabel,
  type ExpenseReceipt,
} from "../expense-constants";
import { expenseFormSchema, type ExpenseFormData } from "./expense-form-schema";

type FormData = ExpenseFormData;

function resolveSelectableLabel(
  value: string | null | undefined,
  options: string[],
): { selected: string; custom: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { selected: "", custom: "" };
  if (trimmed === "Other") return { selected: "Other", custom: "" };
  if (options.includes(trimmed)) return { selected: trimmed, custom: "" };
  return { selected: "Other", custom: trimmed };
}

export interface ExpenseToEdit {
  id: number;
  category: string;
  amount: number | string;
  description?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  expenseDate: string | Date;
  receiptUrl?: string | null;
  receiptFileName?: string | null;
}

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: string[];
  paymentMethods: string[];
  editExpense?: ExpenseToEdit | null;
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(value ? String(value) : "");
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDisplay(value ? String(value) : "");
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="0.00"
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || /^\d{0,12}(\.\d{0,2})?$/.test(raw)) {
          const num = parseFloat(raw);
          if (!isNaN(num) && num > 999_999_999.99) return;
          setDisplay(raw);
          onChange(isNaN(num) ? 0 : num);
        }
      }}
      onBlur={() => {
        const num = parseFloat(display);
        if (!isNaN(num) && num > 0) {
          setDisplay(num % 1 === 0 ? String(num) : num.toFixed(2));
        }
      }}
      className="text-right font-semibold"
    />
  );
}

type PendingReceipt = {
  id: string;
  file: File;
  preview: string | null;
};

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
  paymentMethods,
  editExpense,
}: CreateExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [existingReceipts, setExistingReceipts] = useState<ExpenseReceipt[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [uploading, setUploading] = useState(false);

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const uploadFileMutation = useUploadFile();
  const isEditMode = !!editExpense;
  const totalReceipts = existingReceipts.length + pendingReceipts.length;
  const canAddMore = totalReceipts < MAX_EXPENSE_RECEIPTS;

  const initialCategory = resolveSelectableLabel(editExpense?.category, categories);
  const initialPayment = resolveSelectableLabel(editExpense?.paymentMethod, paymentMethods);

  const form = useForm<FormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: initialCategory.selected,
      customCategory: initialCategory.custom,
      amount: editExpense ? Number(editExpense.amount) : 0,
      description: editExpense?.description || "",
      merchant: editExpense?.merchant || "",
      paymentMethod: initialPayment.selected,
      customPaymentMethod: initialPayment.custom,
      expenseDate: editExpense?.expenseDate
        ? format(new Date(editExpense.expenseDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    },
  });

  const clearPendingReceipts = useCallback(() => {
    setPendingReceipts((prev) => {
      const toRevoke = prev
        .map((r) => r.preview)
        .filter((p): p is string => !!p?.startsWith("blob:"));
      if (toRevoke.length > 0) {
        queueMicrotask(() => {
          toRevoke.forEach((url) => URL.revokeObjectURL(url));
        });
      }
      return [];
    });
  }, []);

  useEffect(() => {
    if (open) {
      const cat = resolveSelectableLabel(editExpense?.category, categories);
      const pay = resolveSelectableLabel(editExpense?.paymentMethod, paymentMethods);
      form.reset({
        category: cat.selected,
        customCategory: cat.custom,
        amount: editExpense ? Number(editExpense.amount) : 0,
        description: editExpense?.description || "",
        merchant: editExpense?.merchant || "",
        paymentMethod: pay.selected,
        customPaymentMethod: pay.custom,
        expenseDate: editExpense?.expenseDate
          ? format(new Date(editExpense.expenseDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
      });
      setExistingReceipts(
        parseExpenseReceipts(editExpense?.receiptUrl, editExpense?.receiptFileName),
      );
      clearPendingReceipts();
    }
  }, [open, editExpense, form, clearPendingReceipts, categories, paymentMethods]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const room = MAX_EXPENSE_RECEIPTS - (existingReceipts.length + pendingReceipts.length);
    if (room <= 0) {
      toast.error(`You can upload up to ${MAX_EXPENSE_RECEIPTS} receipts`);
      return;
    }

    const accepted = selected.slice(0, room);
    if (selected.length > room) {
      toast.error(`Only ${room} more receipt${room === 1 ? "" : "s"} can be added`);
    }

    const oversized = accepted.find((f) => f.size > MAX_EXPENSE_RECEIPT_BYTES);
    if (oversized) {
      toast.error(`${oversized.name} exceeds the 10MB limit`);
      return;
    }

    const next: PendingReceipt[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPendingReceipts((prev) => [...prev, ...next]);
  };

  const removeExistingReceipt = (index: number) => {
    setExistingReceipts((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingReceipt = (id: string) => {
    setPendingReceipts((prev) => {
      const target = prev.find((r) => r.id === id);
      const preview = target?.preview;
      if (preview?.startsWith("blob:")) {
        queueMicrotask(() => URL.revokeObjectURL(preview));
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const result = await uploadFileMutation.mutateAsync({ file, folder: "receipts" });
      return result.url;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    }
  }, [uploadFileMutation]);

  const onSubmit = useCallback(async (data: FormData) => {
    setIsLoading(true);
    try {
      setUploading(true);
      const uploaded: ExpenseReceipt[] = [];
      for (const pending of pendingReceipts) {
        const url = await uploadFile(pending.file);
        if (!url) {
          toast.error(`Failed to upload ${pending.file.name}`);
          return;
        }
        uploaded.push({ url, fileName: pending.file.name });
      }

      const capitalize = (s?: string) =>
        s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

      const serialized = serializeExpenseReceipts([...existingReceipts, ...uploaded]);

      const paymentMethodRaw =
        data.paymentMethod === "Other" && data.customPaymentMethod?.trim()
          ? data.customPaymentMethod.trim().replace(/\s+/g, " ")
          : data.paymentMethod?.trim();
      const categoryRaw =
        data.category === "Other" && data.customCategory?.trim()
          ? data.customCategory.trim().replace(/\s+/g, " ")
          : data.category.trim();
      const merchantRaw = data.merchant?.trim().replace(/\s+/g, " ") || undefined;

      const expenseData = {
        category: categoryRaw,
        amount: data.amount,
        description: capitalize(data.description?.trim() || undefined),
        merchant: capitalize(merchantRaw),
        paymentMethod: paymentMethodRaw || undefined,
        expenseDate: formatDateOnly(new Date(data.expenseDate)),
        receiptUrl: serialized.receiptUrl ?? (isEditMode ? "" : undefined),
        receiptFileName: serialized.receiptFileName ?? (isEditMode ? "" : undefined),
      };

      if (isEditMode && editExpense) {
        await updateExpenseMutation.mutateAsync({ expenseId: editExpense.id, ...expenseData });
      } else {
        await createExpenseMutation.mutateAsync(expenseData);
      }
      toast.success(isEditMode ? "Expense updated successfully" : "Expense submitted successfully");
      form.reset();
      setExistingReceipts([]);
      clearPendingReceipts();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
      setIsLoading(false);
    }
  }, [
    pendingReceipts,
    existingReceipts,
    isEditMode,
    editExpense,
    form,
    onSuccess,
    createExpenseMutation,
    updateExpenseMutation,
    uploadFile,
    clearPendingReceipts,
  ]);
  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Expense Claim" : "New Expense Claim"}
      description="Submit an expense for reimbursement"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditMode ? "Update Expense" : "Submit Expense"}
      isPending={isLoading || uploading || createExpenseMutation.isPending || updateExpenseMutation.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Category <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== "Other") {
                        form.setValue("customCategory", "");
                        form.clearErrors("customCategory");
                      }
                    }}
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
                  <FormLabel className="text-xs font-medium">Amount (₹) <span className="text-destructive">*</span></FormLabel>
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
                  <p className="text-[11px] text-muted-foreground">
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
                  <FormLabel className="text-xs font-medium">Date <span className="text-destructive">*</span></FormLabel>
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== "Other") {
                        form.setValue("customPaymentMethod", "");
                        form.clearErrors("customPaymentMethod");
                      }
                    }}
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
                  <p className="text-[11px] text-muted-foreground">
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
                  <Input className="text-sm" placeholder="e.g. Amazon, Uber, Hotel Taj" {...field} />
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

            {totalReceipts === 0 ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <Upload className="w-7 text-muted-foreground/50 mb-1.5" />
                <span className="text-sm font-medium text-foreground/70">
                  Upload receipts
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  PDF, PNG, JPG up to 10MB · max {MAX_EXPENSE_RECEIPTS} files
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileChange}
                  aria-label="Upload receipts"
                />
              </label>
            ) : (
              <div className="space-y-2">
                {existingReceipts.map((receipt, index) => {
                  const kind = getReceiptFileKind(receipt.url, receipt.fileName);
                  return (
                  <div
                    key={`existing-${receipt.url}-${index}`}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="h-14 w-14 flex items-center justify-center bg-primary/10 rounded shrink-0 overflow-hidden">
                      {kind === "image" ? (
                        <Image
                          src={receipt.url}
                          alt={receipt.fileName}
                          width={56}
                          height={56}
                          unoptimized
                          className="h-14 w-14 object-cover rounded"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-lg leading-none" aria-hidden>
                            {receiptKindEmoji(kind)}
                          </span>
                          <span className="text-[9px] font-semibold uppercase text-primary">
                            {receiptKindLabel(kind)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <TruncatedText text={receipt.fileName} className="text-sm font-medium text-foreground" />
                      <p className="text-[11px] text-muted-foreground">Attached</p>
                    </div>
                    <AnimatedIconButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExistingReceipt(index)}
                      className="shrink-0 h-7 w-7"
                      aria-label={`Remove ${receipt.fileName}`}
                      icon={XIcon}
                      iconSize={14}
                    />
                  </div>
                  );
                })}

                {pendingReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
                  >
                    {receipt.preview ? (
                      <Image
                        src={receipt.preview}
                        alt={receipt.file.name}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-14 w-14 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 flex items-center justify-center bg-primary/10 rounded shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <TruncatedText text={receipt.file.name} className="text-sm font-medium text-foreground" />
                      <p className="text-[11px] text-muted-foreground">
                        {(receipt.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <AnimatedIconButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePendingReceipt(receipt.id)}
                      className="shrink-0 h-7 w-7"
                      aria-label={`Remove ${receipt.file.name}`}
                      icon={XIcon}
                      iconSize={14}
                    />
                  </div>
                ))}

                {canAddMore && (
                  <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:text-foreground transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    Add another receipt
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileChange}
                      aria-label="Add another receipt"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
