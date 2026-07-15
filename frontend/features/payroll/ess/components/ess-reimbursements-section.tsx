"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Receipt, Plus, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssReimbursements, useSubmitReimbursement } from "@/hooks/api/payroll/ess";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

const CLAIM_CATEGORIES = ["Travel", "Food", "Internet", "Medical", "Fuel", "Office Supplies", "Client Expenses", "Other"];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const reimbursementSchema = z.object({
  category: z.string().min(1, "Select a category"),
  amount: z.string().min(1, "Amount is required").refine((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0;
  }, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required").max(500),
  payrollMonth: z.string().min(1, "Payroll month is required"),
});

type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function SubmitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useSubmitReimbursement();
  const uploadFile = useUploadFile();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  const form = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: { category: "", amount: "", description: "", payrollMonth: getCurrentMonth() },
  });

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(
      { file, folder: "reimbursements" },
      {
        onSuccess: (result) => {
          setReceiptUrl(result.url);
          setReceiptName(file.name);
        },
        onError: () => toast.error("Failed to upload receipt"),
      },
    );
  }

  function handleRemoveReceipt() {
    setReceiptUrl(null);
    setReceiptName(null);
  }

  const handleSubmit = async (values: ReimbursementFormValues) => {
    try {
      await mutation.mutateAsync({
        category: values.category,
        amount: parseFloat(values.amount),
        description: values.description,
        receiptUrl: receiptUrl ?? undefined,
        payrollMonth: values.payrollMonth,
      });
      toast.success("Claim submitted for approval");
      form.reset();
      setReceiptUrl(null);
      setReceiptName(null);
      onClose();
    } catch {
      toast.error("Failed to submit claim");
    }
  };

  function handleClose() {
    form.reset({ category: "", amount: "", description: "", payrollMonth: getCurrentMonth() });
    setReceiptUrl(null);
    setReceiptName(null);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-md">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle>Submit Reimbursement</SheetTitle>
          </SheetHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
          <SheetBody className="px-6 py-4 space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAIM_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
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
                    <Input placeholder="Brief description of the expense" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payrollMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Payroll Month <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <MonthPicker value={field.value} onChange={field.onChange} yearRange={[-1, 1]} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Receipt (optional)</p>
              {receiptUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{receiptName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove receipt"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {uploadFile.isPending ? "Uploading…" : "Upload receipt"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    disabled={uploadFile.isPending}
                    onChange={handleReceiptChange}
                  />
                </label>
              )}
            </div>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || uploadFile.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit Claim"}
            </Button>
          </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function EssReimbursementsSection() {
  const { data: reimbursements, isLoading } = useEssReimbursements();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpenSheet = () => setSheetOpen(true);
  const handleCloseSheet = () => setSheetOpen(false);

  return (
    <section id="reimbursements" className="scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Reimbursements
        </h2>
        <Button size="sm" className="text-xs gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3 w-3" />
          Submit Claim
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div>{Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}</div>
        ) : !reimbursements || reimbursements.length === 0 ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No claims yet"
            description="Submit a reimbursement claim and track its approval status here."
            action={{ label: "Submit Claim", onClick: handleOpenSheet }}
          />
        ) : (
          <div>
            {reimbursements.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: idx * 0.04, ease: "easeOut" }}
                className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.description || formatDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <EssStatusBadge status={r.status} />
                  <span className="text-sm font-semibold tabular-nums text-foreground hidden sm:block">
                    {formatMoney(r.amount)}
                  </span>
                  {r.receiptUrl && <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SubmitSheet open={sheetOpen} onClose={handleCloseSheet} />
    </section>
  );
}
