"use client";

import { useEffect, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import { HrSheet } from "@/components/shared/hr-sheet";
import { toast } from "sonner";
import { useCreateExpense, useUpdateExpense } from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { getValidationFieldErrors } from "@/lib/api-envelope";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  parseExpenseReceipts,
  serializeExpenseReceipts,
  type ExpenseReceipt,
} from "@/lib/expense-constants";
import { expenseFormSchema, type ExpenseFormData } from "./expense-form-schema";
import { ExpenseFormFields } from "./expense-form-fields";
import { type PendingReceipt } from "./receipt-manager";
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

type FormData = ExpenseFormData;

const SAVE_ERROR_TONE = statusToneClasses("danger");

function isFormField(path: string, values: FormData): path is keyof FormData {
  return path in values;
}

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
  selfService?: boolean;
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
  paymentMethods,
  editExpense,
  selfService = false,
}: CreateExpenseDialogProps) {
  const [existingReceipts, setExistingReceipts] = useState<ExpenseReceipt[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [uploading, setUploading] = useState(false);

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense({ selfService });
  const uploadFileMutation = useUploadFile();
  const idempotent = useIdempotentOperation();
  const isEditMode = !!editExpense;

  const initialCategory = resolveSelectableLabel(editExpense?.category, categories);
  const initialPayment = resolveSelectableLabel(editExpense?.paymentMethod, paymentMethods);

  const form = useForm<FormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: initialCategory.selected,
      customCategory: initialCategory.custom,
      amount: editExpense ? String(editExpense.amount) : "",
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
        amount: editExpense ? String(editExpense.amount) : "",
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

  const handleAddPendingReceipts = useCallback((receipts: PendingReceipt[]) => {
    setPendingReceipts((prev) => [...prev, ...receipts]);
  }, []);

  const handleRemoveExistingReceipt = useCallback((index: number) => {
    setExistingReceipts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemovePendingReceipt = useCallback((id: string) => {
    setPendingReceipts((prev) => {
      const target = prev.find((r) => r.id === id);
      const preview = target?.preview;
      if (preview?.startsWith("blob:")) {
        queueMicrotask(() => URL.revokeObjectURL(preview));
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const result = await uploadFileMutation.mutateAsync({ file, folder: "receipts" });
        return result.key;
      } catch (error) {
        toast.error(getErrorMessage(error));
        return null;
      }
    },
    [uploadFileMutation],
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      setUploading(true);
      try {
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
          amount: Number(data.amount),
          description: data.description?.trim()
            ? capitalize(data.description.trim())
            : isEditMode
              ? ""
              : undefined,
          merchant: merchantRaw
            ? capitalize(merchantRaw)
            : isEditMode
              ? ""
              : undefined,
          paymentMethod: paymentMethodRaw || (isEditMode ? "" : undefined),
          expenseDate: formatDateOnly(new Date(data.expenseDate)),
          receiptUrl: serialized.receiptUrl ?? (isEditMode ? "" : undefined),
          receiptFileName: serialized.receiptFileName ?? (isEditMode ? "" : undefined),
        };

        if (isEditMode && editExpense) {
          await updateExpenseMutation.mutateAsync({ expenseId: editExpense.id, ...expenseData });
        } else {
          await createExpenseMutation.mutateAsync({
            body: expenseData,
            config: idempotent.configFor(expenseData),
          });
          idempotent.settle();
        }
        toast.success(isEditMode ? "Expense updated" : "Expense submitted");
        form.reset();
        setExistingReceipts([]);
        clearPendingReceipts();
        onSuccess();
      } catch (error) {
        const values = form.getValues();
        for (const { path, message } of getValidationFieldErrors(error)) {
          if (isFormField(path, values)) form.setError(path, { message });
        }
        form.setError("root.server", { message: `Couldn't save: ${getErrorMessage(error)}` });
      } finally {
        setUploading(false);
      }
    },
    [
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
      idempotent,
    ],
  );

  const guard = useSubmitGuard(onSubmit);
  const saveError = form.formState.errors.root?.server?.message;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Expense Claim" : "New Expense Claim"}
      description="Submit an expense for reimbursement"
      onSubmit={form.handleSubmit(guard.submit)}
      submitLabel={isEditMode ? "Update Expense" : "Submit Expense"}
      isPending={guard.isSubmitting || uploading || createExpenseMutation.isPending || updateExpenseMutation.isPending}
    >
      {saveError ? (
        <p
          role="alert"
          className={`rounded-lg border px-3 py-2 text-sm ${SAVE_ERROR_TONE.surface} ${SAVE_ERROR_TONE.rule} ${SAVE_ERROR_TONE.ink}`}
        >
          {saveError}
        </p>
      ) : null}
      <ExpenseFormFields
        form={form}
        categories={categories}
        paymentMethods={paymentMethods}
        existingReceipts={existingReceipts}
        pendingReceipts={pendingReceipts}
        onAddPendingReceipts={handleAddPendingReceipts}
        onRemoveExistingReceipt={handleRemoveExistingReceipt}
        onRemovePendingReceipt={handleRemovePendingReceipt}
      />
    </HrSheet>
  );
}
