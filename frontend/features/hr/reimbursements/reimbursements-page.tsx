"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef, type ChangeEvent } from "react";
import {
  useReimbursements,
  useCreateReimbursement,
  useProcessReimbursement,
  type Reimbursement,
} from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Receipt, CheckCircle2, XCircle, Upload, FileText, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Medical", "Other"];
const LABEL_CHARS_RE = /^[\p{L}\p{N}\s'.-]+$/u;
const CONSECUTIVE_SPECIAL_RE = /[^\p{L}\p{N}\s]{2,}/u;
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

function isValidOtherLabel(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 100 &&
    /[a-zA-Z]/.test(trimmed) &&
    LABEL_CHARS_RE.test(trimmed) &&
    !CONSECUTIVE_SPECIAL_RE.test(trimmed)
  );
}

function getStatusConfig(s: string | null) {
  if (s === "APPROVED" || s === "PAID") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (s === "REJECTED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    icon: <Receipt className="h-2.5 w-2.5" />,
  };
}

function ReimbursementActions({
  reimbursementId,
  reimbursementUserId,
  currentUserId,
  isAdmin,
  isPending,
  onApprove,
  onStartReject,
}: {
  reimbursementId: number;
  reimbursementUserId: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  isPending: boolean;
  onApprove: (id: number) => void;
  onStartReject: (id: number) => void;
}) {
  function handleApproveClick() { onApprove(reimbursementId); }
  function handleRejectClick() { onStartReject(reimbursementId); }

  if (!isAdmin) return null;
  if (reimbursementUserId === currentUserId) {
    return <span className="text-micro text-muted-foreground italic">Cannot approve own</span>;
  }
  return (
    <div className="flex gap-1 justify-end">
      <Button size="sm" className="gap-1 text-xs" onClick={handleApproveClick} disabled={isPending}>
        <CheckCircle2 className="h-3 w-3" />
        Approve
      </Button>
      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleRejectClick}>
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}

export function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading, isError, refetch } = useReimbursements();
  const create = useCreateReimbursement();
  const process = useProcessReimbursement();
  const uploadFile = useUploadFile();
  const isAdmin = useCan("hr:expenses:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
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
    setSheetOpen(open);
  }, [resetForm]);

  const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value), []);
  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleCustomCategoryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setCustomCategory(e.target.value), []);
  const handleRejectDialogOpenChange = useCallback((open: boolean) => { if (!open) setRejectId(null); }, []);
  const handleOpenNewRequest = useCallback(() => setSheetOpen(true), []);
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
          setReceiptUrl(result.url);
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
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [category, customCategory, amount, description, receiptUrl, create, resetForm]);

  const handleApprove = useCallback(
    (id: number) => {
      process.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Approved"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [process],
  );

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate(
      { id: rejectId, status: "REJECTED" },
      {
        onSuccess: () => {
          toast.success("Rejected");
          setRejectId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [rejectId, process]);

  function handleRetry() { void refetch(); }

  if (isError) {
    return (
      <PageWrapper title="Reimbursements" subtitle="Submit and track expense reimbursements">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load reimbursements</p>
            <p className="text-xs text-muted-foreground mt-1">Something went wrong. Please try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>Try Again</Button>
        </div>
      </PageWrapper>
    );
  }

  const reimbursementColumns: DataTableColumn<Reimbursement>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => <span className="text-xs font-medium">{r.user?.name ?? r.user?.email ?? "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (r) => (
        <span className="inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
          {r.category}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[200px] truncate",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.description ?? "—"}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (r) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const statusCfg = getStatusConfig(r.status);
        return (
          <span className={cn("inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
            {statusCfg.icon}
            {r.status ?? "PENDING"}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => (
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
          ₹{Number(r.amount).toLocaleString("en-IN")}
        </span>
      ),
      sortable: true,
      sortValue: (r) => Number(r.amount),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) =>
        r.status === "PENDING" ? (
          <ReimbursementActions
            reimbursementId={r.id}
            reimbursementUserId={r.userId}
            currentUserId={session?.user?.id}
            isAdmin={isAdmin}
            isPending={process.isPending}
            onApprove={handleApprove}
            onStartReject={setRejectId}
          />
        ) : null,
    },
  ];

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenNewRequest}>
          <Plus className="h-3.5 w-3.5" />
          New Request
        </Button>
      }
    >
      <DataTable<Reimbursement>
        data={items ?? []}
        columns={reimbursementColumns}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            illustrationPreset="expenses"
            title="No reimbursement requests"
            description="Submit expense reimbursement requests for approval."
          />
        }
      />

      <HrSheet
        open={sheetOpen}
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

      <ConfirmSheet
        open={rejectId !== null}
        onOpenChange={handleRejectDialogOpenChange}
        title="Reject Reimbursement"
        description="Are you sure you want to reject this reimbursement request?"
        confirmLabel="Reject"
        destructive
        onConfirm={handleReject}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}
