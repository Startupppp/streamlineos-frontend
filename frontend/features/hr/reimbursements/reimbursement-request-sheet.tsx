"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  CATEGORIES,
  MAX_RECEIPT_BYTES,
  isValidOtherLabel,
} from "./reimbursement-status";

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

  const [category, setCategory] = useState("Travel");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setCategory("Travel");
    setCustomCategory("");
    setAmount("");
    setDescription("");
    setReceiptUrl(null);
    setReceiptFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  }, [resetForm]);

  const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value), []);
  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleCustomCategoryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setCustomCategory(e.target.value), []);
  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    if (value !== "Other") setCustomCategory("");
  }, []);
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

  const handleCreate = useCallback(() => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) { toast.error("Valid amount is required"); return; }
    if (numAmount < 1) { toast.error("Amount must be at least ₹1"); return; }
    if (numAmount > 999999) { toast.error("Amount must be at most ₹9,99,999"); return; }

    let resolvedCategory = category;
    if (category === "Other") {
      const other = customCategory.trim().replace(/\s+/g, " ");
      if (!other) {
        toast.error("Please describe what the other category is");
        return;
      }
      if (!isValidOtherLabel(other)) {
        toast.error("Category can only use letters, numbers, spaces, apostrophes, periods, and hyphens");
        return;
      }
      resolvedCategory = other;
    }

    create.mutate(
      {
        category: resolvedCategory,
        amount: numAmount,
        description: description || undefined,
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
  }, [category, customCategory, amount, description, receiptUrl, create, resetForm]);

  return (
      <HrSheet
        open={open}
        onOpenChange={handleSheetOpenChange}
        title="Submit Reimbursement"
        onSubmit={handleCreate}
        submitLabel="Submit"
        isPending={create.isPending || uploadFile.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category === "Other" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              What is the other category? <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Client entertainment, Team offsite"
              value={customCategory}
              onChange={handleCustomCategoryChange}
            />
            <p className="text-dense text-muted-foreground">
              Letters, numbers, spaces, apostrophes, periods, and hyphens only.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Amount (₹) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="1"
            max="999999"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Details about the expense..."
            value={description}
            onChange={handleDescriptionChange}
            rows={3}
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Receipt</label>
          {!receiptUrl ? (
            <button
              type="button"
              onClick={handleClickUpload}
              disabled={uploadFile.isPending}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
            >
              <Upload className="mb-2 h-7 w-7 text-muted-foreground/50" />
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
      </HrSheet>
  );
}
