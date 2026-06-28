"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, IndianRupee, CheckCircle2, Check, ChevronsUpDown } from "lucide-react";
import { formatINR } from "@/lib/format-utils";
import type { Employee } from "@/types/hr";

interface Bonus {
  id: number;
  userId: string;
  employeeName: string | null;
  amount: string;
  type: string | null;
  reason: string | null;
  status: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

const bonusKeys = {
  all: [...queryKeys.hr.all, "bonuses"] as const,
  list: () => [...bonusKeys.all, "list"] as const,
};

const BONUS_TYPES: { value: string; label: string }[] = [
  { value: "PERFORMANCE", label: "Performance" },
  { value: "REFERRAL", label: "Referral" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "SPOT", label: "Spot" },
  { value: "ANNUAL", label: "Annual" },
];

const STATUS_META: Record<string, { label: string; badge: string; accent: string }> = {
  PENDING: {
    label: "Pending",
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  APPROVED: {
    label: "Approved",
    badge: "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300",
    accent: "border-l-blue-500",
  },
  PAID: {
    label: "Paid",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
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

  const resetForm = useCallback(() => {
    setUserId(""); setAmount(""); setType("PERFORMANCE"); setReason("");
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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
          toast.success("Bonus created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, amount, type, reason, create, resetForm]);

  const handleMarkPaid = useCallback(() => {
    if (!payId) return;
    markPaid.mutate(payId, {
      onSuccess: () => { toast.success("Bonus marked as paid"); setPayId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [payId, markPaid]);

  const handlePayDialogChange = useCallback((open: boolean) => { if (!open) setPayId(null); }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Bonus Processing" subtitle="Employee bonus processing">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Bonus Processing"
      subtitle="Manage and disburse employee bonuses"
      badge={`${bonuses?.length ?? 0} bonuses`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Add Bonus
        </Button>
      }
    >
      {!bonuses?.length ? (
        <EmptyState
          illustration={<IndianRupee className="h-8 w-8 text-muted-foreground" />}
          title="No bonuses on record"
          description="Create a bonus to reward employees for their outstanding work."
          action={{ label: "Add Bonus", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground/80">Employee</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Amount</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Type</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Date</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonuses.map((b: Bonus) => {
                    const status = b.status ?? "PENDING";
                    const statusMeta = STATUS_META[status] ?? STATUS_META.PENDING;
                    const typeLabel = BONUS_TYPES.find((t) => t.value === b.type)?.label ?? b.type ?? "Bonus";

                    return (
                      <TableRow key={b.id} className={cn(
                        "border-l-4 transition-colors duration-200",
                        statusMeta.accent,
                      )}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(b.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{b.employeeName ?? "Employee"}</p>
                              {b.reason && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{b.reason}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatINR(b.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-800 dark:text-violet-300">
                            {typeLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            statusMeta.badge,
                          )}>
                            {statusMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.paidAt
                            ? format(new Date(b.paidAt), "MMM d, yyyy")
                            : b.createdAt
                              ? format(new Date(b.createdAt), "MMM d, yyyy")
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.status !== "PAID" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => setPayId(b.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Add Bonus"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={employeePickerOpen}
                className="w-full justify-between font-normal"
              >
                {userId
                  ? (employees.find((e) => e.id === userId)?.name ?? employees.find((e) => e.id === userId)?.email ?? "Select employee")
                  : "Select employee"}
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
                      <CommandItem
                        key={e.id}
                        value={e.name ?? e.email ?? e.id}
                        onSelect={() => { setUserId(e.id); setEmployeePickerOpen(false); }}
                      >
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
            <Input
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                {BONUS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason</label>
          <Textarea
            placeholder="Why is this bonus being awarded?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{reason.length}/500</p>
        </div>
      </HrSheet>

      <ConfirmDialog
        open={payId !== null}
        onOpenChange={handlePayDialogChange}
        title="Mark Bonus as Paid"
        description="Confirm that this bonus has been disbursed to the employee?"
        confirmLabel="Mark Paid"
        onConfirm={handleMarkPaid}
        isPending={markPaid.isPending}
      />
    </PageWrapper>
  );
}

export default function BonusesPage() {
  return (
    <DashboardGate permission="hr:payroll:generate">
      <BonusContent />
    </DashboardGate>
  );
}
