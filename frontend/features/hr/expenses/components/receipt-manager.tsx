"use client";

import { type ChangeEvent } from "react";
import Image from "next/image";
import { Upload, Receipt } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  MAX_EXPENSE_RECEIPTS,
  MAX_EXPENSE_RECEIPT_BYTES,
  getReceiptFileKind,
  receiptKindIcon,
  receiptKindLabel,
  type ExpenseReceipt,
  type ReceiptFileKind,
} from "@/lib/expense-constants";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";

export type PendingReceipt = {
  id: string;
  file: File;
  preview: string | null;
};

interface ReceiptManagerProps {
  existingReceipts: ExpenseReceipt[];
  pendingReceipts: PendingReceipt[];
  onAddPending: (receipts: PendingReceipt[]) => void;
  onRemoveExisting: (index: number) => void;
  onRemovePending: (id: string) => void;
}

export function ReceiptManager({
  existingReceipts,
  pendingReceipts,
  onAddPending,
  onRemoveExisting,
  onRemovePending,
}: ReceiptManagerProps) {
  const totalReceipts = existingReceipts.length + pendingReceipts.length;
  const canAddMore = totalReceipts < MAX_EXPENSE_RECEIPTS;

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
    onAddPending(next);
  };

  if (totalReceipts === 0) {
    return (
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
        <Upload className="w-7 text-muted-foreground mb-1.5" />
        <span className="text-sm font-medium text-foreground/70">Upload receipts</span>
        <span className="text-dense text-muted-foreground mt-0.5">
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
    );
  }

  return (
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
                  src={resolveImageUrl(receipt.url) ?? receipt.url}
                  alt={receipt.fileName}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 object-cover rounded"
                />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <ReceiptKindIcon kind={kind} className="h-5 w-5 text-primary" />
                  <span className="text-micro font-semibold uppercase text-primary">
                    {receiptKindLabel(kind)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <TruncatedText text={receipt.fileName} className="text-sm font-medium text-foreground" />
              <p className="text-dense text-muted-foreground">Attached</p>
            </div>
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveExisting(index)}
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
            <p className="text-dense text-muted-foreground">
              {(receipt.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <AnimatedIconButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemovePending(receipt.id)}
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
  );
}

function ReceiptKindIcon({ kind, className }: { kind: ReceiptFileKind; className?: string }) {
  const Icon = receiptKindIcon(kind);
  return <Icon className={className} aria-hidden />;
}
