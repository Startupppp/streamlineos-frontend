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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, IndianRupee, CheckCircle2, Check, ChevronsUpDown } from "lucide-react";
import { formatINR } from "@/lib/format-utils";
import type { Employee } from "@/types/hr";
import { EmptyExpensesIllustration } from "@/components/illustrations";

interface Bonus {
  id: number; userId: string; employeeName: string | null; amount: string;
  type: string | null; reason: string | null; status: string | null;
  paidAt: string | null; createdAt: string | null;
}

const bonusKeys = { all: [...queryKeys.hr.all, "bonuses"] as const, list: () => [...bonusKeys.all, "list"] as const };

const BONUS_TYPES: { value: string; label: string }[] = [
  { value: "PERFORMANCE", label: "Performance" },
  { value: "REFERRAL", label: "Referral" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "SPOT", label: "Spot" },
  { value: "ANNUAL", label: "Annual" },
];

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
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("PERFORMANCE");
  const [reason, setReason] = useState("");

  const handleAmountChange = useCallback((val: string) => {
    if (val === "" || /^\d{0,10}(\.\d{0,2})?$/.test(val)) setAmount(val);
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Please select an employee"); return; }
    if (!amount) { toast.error("Amount is required"); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Amount must be a positive number"); return; }
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount)) { toast.error("Amount must be a valid number with up to 2 decimal places"); return; }
    const trimmedReason = reason.trim();
    if (trimmedReason && trimmedReason.length < 3) { toast.error("Reason must be at least 3 characters"); return; }
    if (trimmedReason.length > 500) { toast.error("Reason must be at most 500 characters"); return; }
    if (trimmedReason && /\s{2,}/.test(trimmedReason)) { toast.error("Reason cannot have multiple consecutive spaces"); return; }
    if (trimmedReason && /^[\s\W]+$/.test(trimmedReason)) { toast.error("Reason cannot consist of only special characters"); return; }
    create.mutate(
      { userId, amount: parsed, type, reason: trimmedReason || undefined },
      {
        onSuccess: () => {
          toast.success("Bonus created"); setSheetOpen(false);
          setUserId(""); setAmount(""); setType("PERFORMANCE"); setReason("");
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
          <EmptyExpensesIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No bonuses on record.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {bonuses.map((b: Bonus) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <IndianRupee className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{b.employeeName ?? "Employee"}</p>
                    <Badge variant="outline" className="text-[10px]">{BONUS_TYPES.find((t) => t.value === b.type)?.label ?? b.type ?? "Bonus"}</Badge>
                    <Badge variant={statusBadge(b.status)} className="text-[10px]">{b.status ?? "PENDING"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{formatINR(b.amount)}</span>
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

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) { setUserId(""); setAmount(""); setType("PERFORMANCE"); setReason(""); } setSheetOpen(open); }} title="Add Bonus" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={employeePickerOpen} className="w-full justify-between font-normal">
                {userId ? (employees.find((e) => e.id === userId)?.name ?? employees.find((e) => e.id === userId)?.email ?? "Select employee") : "Select employee"}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {employees.filter((e) => !!e.id).map((e) => (
                      <CommandItem key={e.id} value={e.name ?? e.email ?? e.id} onSelect={() => { setUserId(e.id); setEmployeePickerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", userId === e.id ? "opacity-100" : "opacity-0")} />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount <span className="text-destructive">*</span></label>
            <Input placeholder="0.00" value={amount} onChange={(e) => handleAmountChange(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BONUS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason</label>
          <Textarea placeholder="Why is this bonus being awarded?" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
          <p className="text-[10px] text-muted-foreground text-right">{reason.length}/500</p>
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
