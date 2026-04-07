"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrEmployees } from "@/lib/api/hooks/hr";
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
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Gift, DollarSign, CheckCircle2 } from "lucide-react";
import type { Employee } from "@/types/hr";

interface Bonus {
  id: number; userId: string; employeeName: string | null; amount: string;
  type: string | null; reason: string | null; status: string | null;
  paidAt: string | null; createdAt: string | null;
}

const bonusKeys = { all: [...queryKeys.hr.all, "bonuses"] as const, list: () => [...bonusKeys.all, "list"] as const };

const BONUS_TYPES = ["Performance", "Referral", "Festival", "Spot", "Retention", "Other"];

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "PAID") return "default";
  if (s === "APPROVED") return "secondary";
  return "outline";
}

function BonusContent() {
  const qc = useQueryClient();
  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const { data: bonuses, isLoading } = useQuery({
    queryKey: bonusKeys.list(),
    queryFn: () => apiClient.get<Bonus[]>("/hr/bonuses"),
  });

  const create = useMutation({
    mutationFn: (data: { userId: string; amount: number; type?: string; reason?: string }) =>
      apiClient.post<Bonus>("/hr/bonuses", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.list() }),
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => apiClient.patch<{ success: boolean }>(`/hr/bonuses/${id}`, { status: "PAID" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [payId, setPayId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Performance");
  const [reason, setReason] = useState("");

  const handleCreate = useCallback(() => {
    if (!userId || !amount || Number(amount) <= 0) { toast.error("Employee and valid amount are required"); return; }
    create.mutate(
      { userId, amount: Number(amount), type, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success("Bonus created"); setSheetOpen(false);
          setUserId(""); setAmount(""); setType("Performance"); setReason("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, amount, type, reason, create]);

  const handleMarkPaid = useCallback(() => {
    if (!payId) return;
    markPaid.mutate(payId, {
      onSuccess: () => { toast.success("Bonus marked as paid"); setPayId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [payId, markPaid]);

  if (isLoading) {
    return (
      <PageWrapper title="Bonuses" subtitle="Employee bonus processing">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Bonus Processing"
      subtitle="Manage and disburse employee bonuses"
      badge={`${bonuses?.length ?? 0} bonuses`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Bonus</Button>}
    >
      {!bonuses?.length ? (
        <Card><CardContent className="py-12 text-center">
          <Gift className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bonuses on record.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {bonuses.map((b: Bonus) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{b.employeeName ?? "Employee"}</p>
                    <Badge variant="outline" className="text-[10px]">{b.type ?? "Bonus"}</Badge>
                    <Badge variant={statusBadge(b.status)} className="text-[10px]">{b.status ?? "PENDING"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">${Number(b.amount).toLocaleString()}</span>
                    {b.reason && <span className="line-clamp-1">{b.reason}</span>}
                    {b.createdAt && <span>{format(new Date(b.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                {b.status !== "PAID" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayId(b.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Mark Paid
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add Bonus" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BONUS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason</label>
          <Textarea placeholder="Why is this bonus being awarded?" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={payId !== null}
        onOpenChange={(open) => { if (!open) setPayId(null); }}
        title="Mark Bonus as Paid"
        description="Confirm that this bonus has been disbursed to the employee?"
        confirmLabel="Mark Paid"
        variant="default"
        onConfirm={handleMarkPaid}
        isPending={markPaid.isPending}
      />
    </PageWrapper>
  );
}

export default function BonusesPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <BonusContent />
    </DashboardGate>
  );
}
