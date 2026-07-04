"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Receipt, Plus, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations/empty-expenses";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssReimbursements, useSubmitReimbursement } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

const CLAIM_CATEGORIES = ["Travel", "Food", "Internet", "Medical", "Fuel", "Office Supplies", "Client Expenses", "Other"];

const reimbursementSchema = z.object({
  category: z.string().min(1, "Select a category"),
  amount: z.string().min(1, "Amount is required").refine((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0;
  }, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required").max(500),
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
  const form = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: { category: "", amount: "", description: "" },
  });

  const handleSubmit = async (values: ReimbursementFormValues) => {
    try {
      await mutation.mutateAsync({
        category: values.category,
        amount: parseFloat(values.amount),
        description: values.description,
      });
      toast.success("Claim submitted for approval");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to submit claim");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Submit Reimbursement</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
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
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" />
              Receipt upload: share a link in description if needed
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
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
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3 w-3" />
          Submit Claim
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div>{Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}</div>
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
                  <div className="h-8 w-8 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-emerald-600" />
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
