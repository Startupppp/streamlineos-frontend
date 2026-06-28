"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useReimbursements,
  useCreateReimbursement,
  useProcessReimbursement,
  type Reimbursement,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Receipt, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCan } from "@/lib/api/hooks/access";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Medical", "Other"];

type ReimbStatus = "APPROVED" | "PAID" | "REJECTED" | "PENDING";

function getStatusConfig(s: string | null) {
  if (s === "APPROVED" || s === "PAID") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (s === "REJECTED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
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
    return <span className="text-[10px] text-muted-foreground italic">Cannot approve own</span>;
  }
  return (
    <div className="flex gap-1 justify-end">
      <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleApproveClick} disabled={isPending}>
        <CheckCircle2 className="h-3 w-3" />
        Approve
      </Button>
      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleRejectClick}>
        <XCircle className="h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}

export default function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading, isError, refetch } = useReimbursements();
  const create = useCreateReimbursement();
  const process = useProcessReimbursement();
  const isAdmin = useCan("hr:expenses:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [category, setCategory] = useState("Travel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCategory("Travel");
      setAmount("");
      setDescription("");
      setReceiptUrl("");
    }
    setSheetOpen(open);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value), []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleReceiptUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setReceiptUrl(e.target.value), []);
  const handleRejectDialogOpenChange = useCallback((open: boolean) => { if (!open) setRejectId(null); }, []);
  const handleOpenNewRequest = useCallback(() => setSheetOpen(true), []);

  const handleCreate = useCallback(() => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) { toast.error("Valid amount is required"); return; }
    if (numAmount < 1) { toast.error("Amount must be at least ₹1"); return; }
    if (numAmount > 999999) { toast.error("Amount must be at most ₹9,99,999"); return; }
    if (receiptUrl && !/^(https?:\/\/|www\.)\S+/.test(receiptUrl.trim())) {
      toast.error("Enter a valid URL (e.g. https://... or www....)");
      return;
    }
    const normalizedUrl =
      receiptUrl && receiptUrl.trim().startsWith("www.")
        ? `https://${receiptUrl.trim()}`
        : receiptUrl.trim();
    create.mutate(
      {
        category,
        amount: numAmount,
        description: description || undefined,
        receiptUrl: normalizedUrl || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Reimbursement submitted");
          setSheetOpen(false);
          setCategory("Travel");
          setAmount("");
          setDescription("");
          setReceiptUrl("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [category, amount, description, receiptUrl, create]);

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

  if (isLoading) {
    return (
      <PageWrapper title="Reimbursements" subtitle="Expense reimbursement requests">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

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

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      badge={`${items?.length ?? 0} requests`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenNewRequest}>
          <Plus className="h-3.5 w-3.5" />
          New Request
        </Button>
      }
    >
      {!items?.length ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <EmptyState
            illustration={<Receipt className="h-8 w-8 text-muted-foreground" />}
            title="No reimbursement requests"
            description="Submit expense reimbursement requests for approval."
          />
        </div>
      ) : (
        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground/80 text-xs">Employee</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Category</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Description</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Date</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r: Reimbursement) => {
                    const statusCfg = getStatusConfig(r.status);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/20 transition-colors duration-200">
                        <TableCell className="text-xs font-medium">
                          {r.user?.name ?? r.user?.email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                            {r.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {r.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
                            {statusCfg.icon}
                            {r.status ?? "PENDING"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums whitespace-nowrap">
                          ₹{Number(r.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "PENDING" && (
                            <ReimbursementActions
                              reimbursementId={r.id}
                              reimbursementUserId={r.userId}
                              currentUserId={session?.user?.id}
                              isAdmin={isAdmin}
                              isPending={process.isPending}
                              onApprove={handleApprove}
                              onStartReject={setRejectId}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Submit Reimbursement"
        onSubmit={handleCreate}
        submitLabel="Submit"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <label className="text-sm font-medium">Receipt URL</label>
          <Input
            type="text"
            placeholder="https://... or www.example.com"
            value={receiptUrl}
            onChange={handleReceiptUrlChange}
          />
        </div>
      </HrSheet>

      <ConfirmDialog
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
