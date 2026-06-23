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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileSpreadsheet, IndianRupee, CheckCircle2 } from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import type { Employee, PaginatedEmployees } from "@/types/hr";

interface FnfSettlement {
  id: number;
  userId: string;
  basicDues: string | null;
  leaveEncashment: string | null;
  bonusDue: string | null;
  deductions: string | null;
  loanRecovery: string | null;
  netPayable: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
  user?: { name: string | null; email: string } | null;
}

const fnfKeys = { all: [...queryKeys.hr.all, "fnf"] as const, list: () => [...fnfKeys.all, "list"] as const };

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "PAID") return "default";
  if (s === "APPROVED") return "secondary";
  if (s === "PENDING_APPROVAL") return "outline";
  return "outline";
}

function FnfContent() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: fnfKeys.list(),
    queryFn: () => apiClient.get<FnfSettlement[]>("/hr/fnf"),
  });

  const create = useMutation({
    mutationFn: (data: {
      userId: string;
      basicDues?: number;
      leaveEncashment?: number;
      bonusDue?: number;
      deductions?: number;
      loanRecovery?: number;
      notes?: string;
    }) => apiClient.post<FnfSettlement>("/hr/fnf", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const complete = useMutation({
    mutationFn: (id: number) => apiClient.patch<{ success: boolean }>(`/hr/fnf/${id}`, { status: "PAID" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    return (employeesRaw as PaginatedEmployees | undefined)?.data ?? [];
  }, [employeesRaw]);
  const employeeOptions = useMemo<ComboboxOption[]>(() =>
    employees
      .filter((e) => e.isActive)
      .map((e) => ({
        value: e.id,
        label: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : (e.name ?? e.email),
        sublabel: e.designation ?? e.email,
      })),
    [employees],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [basicDues, setBasicDues] = useState("");
  const [leaveEncashment, setLeaveEncashment] = useState("");
  const [bonusDue, setBonusDue] = useState("");
  const [deductions, setDeductions] = useState("");
  const [loanRecovery, setLoanRecovery] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    setUserId(""); setBasicDues(""); setLeaveEncashment("");
    setBonusDue(""); setDeductions(""); setLoanRecovery(""); setNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      {
        userId,
        basicDues: basicDues ? Number(basicDues) : undefined,
        leaveEncashment: leaveEncashment ? Number(leaveEncashment) : undefined,
        bonusDue: bonusDue ? Number(bonusDue) : undefined,
        deductions: deductions ? Number(deductions) : undefined,
        loanRecovery: loanRecovery ? Number(loanRecovery) : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("FnF settlement created"); setSheetOpen(false); resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, basicDues, leaveEncashment, bonusDue, deductions, loanRecovery, notes, create, resetForm]);

  const handleComplete = useCallback(() => {
    if (!completeId) return;
    complete.mutate(completeId, {
      onSuccess: () => { toast.success("Settlement marked as completed"); setCompleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, complete]);

  if (isLoading) {
    return (
      <PageWrapper title="Full & Final Settlement" subtitle="Employee separation settlements">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Full & Final Settlement"
      subtitle="Manage full and final settlements for separated employees"
      badge={`${items?.length ?? 0} settlements`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Settlement</Button>}
    >
      {!items?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyExpensesIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
          <p className="text-sm text-muted-foreground">No FnF settlements on record.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item: FnfSettlement) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.user?.name && <p className="text-sm font-semibold">{item.user.name}</p>}
                    <Badge variant={statusBadge(item.status)} className="text-[10px]">{item.status ?? "DRAFT"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    {item.netPayable && (
                      <span className="flex items-center gap-0.5 font-medium text-foreground">
                        <IndianRupee className="h-3 w-3" />
                        {Number(item.netPayable).toLocaleString("en-IN")} net
                      </span>
                    )}
                    {item.deductions && Number(item.deductions) > 0 && (
                      <span>Deductions: ₹{Number(item.deductions).toLocaleString("en-IN")}</span>
                    )}
                    {item.loanRecovery && Number(item.loanRecovery) > 0 && (
                      <span>Loan Recovery: ₹{Number(item.loanRecovery).toLocaleString("en-IN")}</span>
                    )}
                    {item.createdAt && <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>}
                </div>
                {item.status !== "PAID" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setCompleteId(item.id)} disabled={complete.isPending}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }}
        title="New FnF Settlement"
        onSubmit={handleCreate}
        submitLabel="Create Settlement"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Combobox
            options={employeeOptions}
            value={userId}
            onChange={setUserId}
            placeholder="Select employee…"
            searchPlaceholder="Search by name…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Basic Dues (₹)</label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={basicDues} onChange={(e) => setBasicDues(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Leave Encashment (₹)</label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={leaveEncashment} onChange={(e) => setLeaveEncashment(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bonus Due (₹)</label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={bonusDue} onChange={(e) => setBonusDue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Deductions (₹)</label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Loan Recovery (₹)</label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={loanRecovery} onChange={(e) => setLoanRecovery(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Additional settlement notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={completeId !== null}
        onOpenChange={(open) => { if (!open) setCompleteId(null); }}
        title="Complete Settlement"
        description="Are you sure you want to mark this FnF settlement as completed?"
        confirmLabel="Complete"
        onConfirm={handleComplete}
        isPending={complete.isPending}
      />
    </PageWrapper>
  );
}

export default function FnfPage() {
  return (
    <DashboardGate allowedRoles={["HR", "CEO"]}>
      <FnfContent />
    </DashboardGate>
  );
}
