"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useReimbursements, useCreateReimbursement, useProcessReimbursement,
  type Reimbursement,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Receipt, CheckCircle2, XCircle, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";

const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Medical", "Other"];

function statusBadge(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "APPROVED" || s === "PAID") return "default";
  if (s === "REJECTED") return "destructive";
  return "outline";
}

export default function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading } = useReimbursements();
  const create = useCreateReimbursement();
  const process = useProcessReimbursement();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:employees");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [category, setCategory] = useState("Travel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const handleCreate = useCallback(() => {
    if (!amount || Number(amount) <= 0) { toast.error("Valid amount is required"); return; }
    create.mutate(
      { category, amount: Number(amount), description: description || undefined, receiptUrl: receiptUrl || undefined },
      {
        onSuccess: () => {
          toast.success("Reimbursement submitted");
          setSheetOpen(false); setCategory("Travel"); setAmount(""); setDescription(""); setReceiptUrl("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [category, amount, description, receiptUrl, create]);

  const handleApprove = useCallback((id: number) => {
    process.mutate({ id, status: "APPROVED" }, {
      onSuccess: () => toast.success("Approved"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [process]);

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate({ id: rejectId, status: "REJECTED" }, {
      onSuccess: () => { toast.success("Rejected"); setRejectId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rejectId, process]);

  if (isLoading) {
    return (
      <PageWrapper title="Reimbursements" subtitle="Expense reimbursement requests">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      badge={`${items?.length ?? 0} requests`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Request</Button>}
    >
      {!items?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyExpensesIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No reimbursement requests yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((r: Reimbursement) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{r.category}</p>
                    <Badge variant={statusBadge(r.status)} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">${Number(r.amount).toLocaleString()}</span>
                    {r.user?.name && <span>{r.user.name}</span>}
                    {r.createdAt && <span>{format(new Date(r.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
                </div>
                {isAdmin && r.status === "PENDING" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleApprove(r.id)} disabled={process.isPending}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRejectId(r.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Submit Reimbursement" onSubmit={handleCreate} submitLabel="Submit" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount</label>
          <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Details about the expense..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Receipt URL</label>
          <Input placeholder="https://..." value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={rejectId !== null}
        onOpenChange={(open) => { if (!open) setRejectId(null); }}
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
