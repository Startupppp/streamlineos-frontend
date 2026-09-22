"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import { HrSheet } from "@/components/shared/hr-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCreateReimbursement } from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { CATEGORIES, MAX_RECEIPT_BYTES } from "./reimbursement-status";
import {
  REIMBURSEMENT_DEFAULTS,
  REIMBURSEMENT_MAX_AMOUNT,
  REIMBURSEMENT_MIN_AMOUNT,
  reimbursementSchema,
  resolvedReimbursementCategory,
  type ReimbursementFormValues,
} from "./reimbursement-schema";

interface ReimbursementRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReimbursementRequestSheet({
  open,
  onOpenChange,
}: ReimbursementRequestSheetProps) {
  const create = useCreateReimbursement();
  const uploadFile = useUploadFile();
  const form = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: REIMBURSEMENT_DEFAULTS,
    mode: "onChange",
  });
  const category = form.watch("category");

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    form.reset(REIMBURSEMENT_DEFAULTS);
    setReceiptUrl(null);
    setReceiptFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [form]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  }, [resetForm, onOpenChange]);

  const handleClickUpload = useCallback(() => fileInputRef.current?.click(), []);
  const handleRemoveReceipt = useCallback(() => {
    setReceiptUrl(null);
    setReceiptFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleReceiptChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("Receipt must be at most 10MB");
      return;
    }
    uploadFile.mutate(
      { file, folder: "receipts" },
      {
        onSuccess: (result) => {
          setReceiptUrl(result.key);
          setReceiptFileName(file.name);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [uploadFile]);

  const handleCreate = useCallback((values: ReimbursementFormValues) => {
    create.mutate(
      {
        category: resolvedReimbursementCategory(values),
        amount: Number(values.amount),
        description: values.description || undefined,
        receiptUrl: receiptUrl || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Reimbursement submitted");
          onOpenChange(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [receiptUrl, create, onOpenChange, resetForm]);

  return (
      <HrSheet
        open={open}
        onOpenChange={handleSheetOpenChange}
        title="Submit reimbursement"
        onSubmit={form.handleSubmit(handleCreate)}
        submitLabel="Submit reimbursement"
        isPending={create.isPending || uploadFile.isPending}
        isDirty={form.formState.isDirty}
        onDiscard={resetForm}
      >
        <Form {...form}>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {category === "Other" && (
          <FormField
            control={form.control}
            name="customCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  What is the other category? <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Client entertainment, Team offsite" {...field} />
                </FormControl>
                <FormDescription>Letters, numbers, spaces, apostrophes, periods, and hyphens only.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Amount (₹) <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={REIMBURSEMENT_MIN_AMOUNT}
                  max={REIMBURSEMENT_MAX_AMOUNT}
                  step="0.01"
                  placeholder="0.00"
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Details about the expense..."
                  rows={3}
                  maxLength={1000}
                  className="resize-none w-full"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Receipt</label>
          {!receiptUrl ? (
            <button
              type="button"
              onClick={handleClickUpload}
              disabled={uploadFile.isPending}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
            >
              <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground/70">
                {uploadFile.isPending ? "Uploading…" : "Upload receipt"}
              </span>
              <span className="mt-0.5 text-dense text-muted-foreground">
                PDF, PNG, JPG up to 10MB
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <TruncatedText text={receiptFileName ?? "Receipt"} className="text-sm font-medium text-foreground" />
                <p className="text-dense text-muted-foreground">Attached</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleRemoveReceipt}
                aria-label="Remove receipt"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleReceiptChange}
            aria-label="Upload receipt"
          />
        </div>
        </Form>
      </HrSheet>
  );
}
