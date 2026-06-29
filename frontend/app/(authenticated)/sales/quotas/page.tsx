"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Target,
  Plus,
  TrendingUp,
  IndianRupee,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useSalesQuotas, useCreateSalesQuota } from "@/hooks/api/crm";
import { useHrEmployees } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { SalesQuota } from "@/hooks/api/crm";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { EmptyTargetIllustration } from "@/components/illustrations";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function SalesQuotasPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [notes, setNotes] = useState("");

  const { data: quotas, isLoading } = useSalesQuotas();
  const { data: employeesData } = useHrEmployees({ limit: 100 });
  const createQuota = useCreateSalesQuota();

  const items: SalesQuota[] = Array.isArray(quotas) ? quotas : [];
  const employeeList = useMemo(() => {
    if (!employeesData) return [];
    const list: Employee[] = Array.isArray(employeesData) ? employeesData : (employeesData as PaginatedEmployees).data;
    return list.flatMap((e) => (e.name ? [{ id: e.id, name: e.name }] : []));
  }, [employeesData]);

  const totalTarget = items.reduce((s, q) => s + Number(q.targetRevenue), 0);
  const totalActual = items.reduce((s, q) => s + Number(q.actualRevenue), 0);
  const overallAttainment = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleUserIdChange = useCallback((v: string) => setUserId(v), []);
  const handlePeriodChange = useCallback((v: string) => setPeriod(v), []);
  const handleStartDateChange = useCallback((v: string) => setStartDate(v), []);
  const handleEndDateChange = useCallback((v: string) => setEndDate(v), []);
  const handleTargetRevenueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTargetRevenue(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const resetForm = useCallback(() => {
    setUserId(""); setPeriod("monthly"); setStartDate(""); setEndDate("");
    setTargetRevenue(""); setNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId || !startDate || !endDate || !targetRevenue) {
      toast.error("Employee, dates, and target revenue are required");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }
    const target = Number(targetRevenue);
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Target revenue must be a positive number");
      return;
    }
    createQuota.mutate(
      { userId, period, startDate, endDate, targetRevenue, notes: notes || undefined },
      {
        onSuccess: () => { toast.success("Quota created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, period, startDate, endDate, targetRevenue, notes, createQuota, resetForm]);

  return (
    <PageWrapper
      title="Sales Quotas"
      subtitle="Manage revenue targets per rep"
      actions={
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Set Quota
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total Target" value={fmt(totalTarget)} icon={Target} color="blue" />
          <StatCard label="Total Actual" value={fmt(totalActual)} icon={IndianRupee} color="green" />
          <StatCard label="Overall Attainment" value={`${overallAttainment}%`} icon={TrendingUp} color={overallAttainment >= 80 ? "green" : overallAttainment >= 50 ? "gold" : "red"} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead>Attainment</TableHead>
                    <TableHead>Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyTargetIllustration className="h-36 w-36 opacity-95" />
                      <p>No quotas set yet.</p>
                    </div></TableCell></TableRow>
                  ) : items.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm">{q.userName ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[11px] capitalize">{q.period}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{fmt(q.targetRevenue)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(q.actualRevenue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${q.attainmentPct >= 100 ? "bg-green-600" : "bg-primary"}`} style={{ width: `${Math.min(q.attainmentPct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${q.attainmentPct >= 100 ? "text-green-600" : ""}`}>{q.attainmentPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {q.startDate && q.endDate ? `${format(new Date(q.startDate), "dd MMM")} – ${format(new Date(q.endDate), "dd MMM yyyy")}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Set Sales Quota" description="Assign a revenue target to a team member." onSubmit={handleCreate} submitLabel="Create Quota" isPending={createQuota.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={handleUserIdChange}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employeeList.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Period</label>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
            <DatePicker value={startDate} onChange={handleStartDateChange} placeholder="Start date" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date <span className="text-destructive">*</span></label>
            <DatePicker value={endDate} onChange={handleEndDateChange} placeholder="End date" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Revenue (₹) <span className="text-destructive">*</span></label>
          <Input type="number" min="0" step="1" value={targetRevenue} onChange={handleTargetRevenueChange} placeholder="e.g. 500000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={notes} onChange={handleNotesChange} placeholder="Optional notes..." rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
