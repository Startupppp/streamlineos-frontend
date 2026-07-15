"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import Image from "next/image";
import { Upload, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const CONTAINS_LETTER_REGEX = /[a-zA-Z]/;
const NO_CONSECUTIVE_SPACES_REGEX = /\s{2,}/;

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(999_999_999.99, "Amount cannot exceed ₹99,99,99,999.99"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .refine((v) => !v || CONTAINS_LETTER_REGEX.test(v), "Description must contain at least one letter")
    .refine((v) => !v || !NO_CONSECUTIVE_SPACES_REGEX.test(v), "Description cannot have consecutive spaces")
    .optional(),
  merchant: z
    .string()
    .max(200, "Merchant name must be at most 200 characters")
    .refine((v) => !v || CONTAINS_LETTER_REGEX.test(v), "Merchant name must contain at least one letter")
    .refine((v) => !v || !NO_CONSECUTIVE_SPACES_REGEX.test(v), "Merchant name cannot have consecutive spaces")
    .optional(),
  paymentMethod: z.string().optional(),
  customPaymentMethod: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
}).superRefine((data, ctx) => {
  if (data.expenseDate) {
    const expDate = new Date(data.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (expDate > today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expense date cannot be in the future", path: ["expenseDate"] });
    }
  }
  if (data.category === "Other" && !data.customCategory?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please specify the category", path: ["customCategory"] });
  }
  if (data.customCategory) {
    const ct = data.customCategory.trim();
    if (ct.length > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category must be at most 100 characters", path: ["customCategory"] });
    if (!CONTAINS_LETTER_REGEX.test(ct)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category must contain at least one letter", path: ["customCategory"] });
    if (NO_CONSECUTIVE_SPACES_REGEX.test(ct)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category cannot have consecutive spaces", path: ["customCategory"] });
  }
  if (data.paymentMethod === "Other" && !data.customPaymentMethod?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please specify the payment method", path: ["customPaymentMethod"] });
  }
  if (data.customPaymentMethod) {
    const pm = data.customPaymentMethod.trim();
    if (pm.length > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method must be at most 100 characters", path: ["customPaymentMethod"] });
    if (!CONTAINS_LETTER_REGEX.test(pm)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method must contain at least one letter", path: ["customPaymentMethod"] });
    if (NO_CONSECUTIVE_SPACES_REGEX.test(pm)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method cannot have consecutive spaces", path: ["customPaymentMethod"] });
  }
});

type FormData = z.infer<typeof formSchema>;

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

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
  paymentMethods,
  editExpense,
}: CreateExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const uploadFileMutation = useUploadFile();
  const isEditMode = !!editExpense;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: editExpense?.category || "",
      customCategory: "",
      amount: editExpense ? Number(editExpense.amount) : 0,
      description: editExpense?.description || "",
      merchant: editExpense?.merchant || "",
      paymentMethod: editExpense?.paymentMethod || "",
      customPaymentMethod: "",
      expenseDate: editExpense?.expenseDate
        ? format(new Date(editExpense.expenseDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category: editExpense?.category || "",
        customCategory: "",
        amount: editExpense ? Number(editExpense.amount) : 0,
        description: editExpense?.description || "",
        merchant: editExpense?.merchant || "",
        paymentMethod: editExpense?.paymentMethod || "",
        customPaymentMethod: "",
        expenseDate: editExpense?.expenseDate
          ? format(new Date(editExpense.expenseDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
      });
      if (editExpense?.receiptUrl) {
        setReceiptPreview(editExpense.receiptUrl);
      } else {
        setReceiptPreview(null);
      }
      setReceiptFile(null);
    }
  }, [open, editExpense, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const result = await uploadFileMutation.mutateAsync({ file, folder: "receipts" });
      return result.url;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setUploading(false);
    }
  }, [uploadFileMutation]);

  const onSubmit = useCallback(async (data: FormData) => {
    setIsLoading(true);
    try {
      let receiptUrl: string | undefined;
      let receiptFileName: string | undefined;

      if (receiptFile) {
        const url = await uploadFile(receiptFile);
        if (url) {
          receiptUrl = url;
          receiptFileName = receiptFile.name;
        }
      }

      const capitalize = (s?: string) =>
        s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

      const expenseData = {
        category: data.category === "Other" && data.customCategory?.trim() ? data.customCategory.trim() : data.category,
        amount: data.amount,
        description: capitalize(data.description),
        merchant: capitalize(data.merchant),
        paymentMethod: data.paymentMethod === "Other" && data.customPaymentMethod?.trim() ? data.customPaymentMethod.trim() : data.paymentMethod,
        expenseDate: formatDateOnly(new Date(data.expenseDate)),
        receiptUrl,
        receiptFileName,
      };

      if (isEditMode && editExpense) {
        await updateExpenseMutation.mutateAsync({ expenseId: editExpense.id, ...expenseData });
      } else {
        await createExpenseMutation.mutateAsync(expenseData);
      }
      toast.success(isEditMode ? "Expense updated successfully" : "Expense submitted successfully");
      form.reset();
      removeFile();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [receiptFile, isEditMode, editExpense, form, onSuccess, createExpenseMutation, updateExpenseMutation, uploadFile]);

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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                  <FormLabel className="text-xs font-medium">Specify Category <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input className="text-sm" placeholder="Enter custom category" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                  <FormLabel className="text-xs font-medium">Specify Payment Method <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input className="text-sm" placeholder="Enter custom payment method" {...field} />
                  </FormControl>
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
            <label className="text-xs font-medium">Receipt</label>
            {!receiptFile && !receiptPreview ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <Upload className="w-7 text-muted-foreground/50 mb-1.5" />
                <span className="text-sm font-medium text-foreground/70">
                  Upload receipt
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  PDF, PNG, JPG up to 10MB
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  aria-label="Upload receipt"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                {receiptPreview ? (
                  <Image
                    src={receiptPreview}
                    alt="Receipt preview"
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 object-cover rounded"
                  />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center bg-primary/10 rounded">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {receiptFile?.name ?? "Existing receipt"}
                  </p>
                  {receiptFile && (
                    <p className="text-[11px] text-muted-foreground">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="shrink-0 h-7 w-7"
                  aria-label="Remove receipt"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
