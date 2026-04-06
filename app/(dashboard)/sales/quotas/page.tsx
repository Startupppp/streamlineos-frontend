"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Target,
  Plus,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useSalesQuotas, useCreateSalesQuota } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks";
import { toast } from "sonner";
import type { SalesQuota } from "@/lib/api/hooks/crm";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function SalesQuotasPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: quotas, isLoading } = useSalesQuotas();
  const { data: employeesData } = useHrEmployees({ limit: 100 });
  const createQuota = useCreateSalesQuota();

  const items: SalesQuota[] = Array.isArray(quotas) ? quotas : [];
  const employees = (employeesData as { data?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }> | undefined);
  const employeeList: Array<{ id: string; name: string }> = Array.isArray(employees) ? employees : (employees?.data ?? employees?.items ?? []);

  const totalTarget = items.reduce((s, q) => s + Number(q.targetRevenue), 0);
  const totalActual = items.reduce((s, q) => s + Number(q.actualRevenue), 0);
  const overallAttainment = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createQuota.mutate(
      {
        userId: fd.get("userId") as string,
        period: fd.get("period") as string,
        startDate: fd.get("startDate") as string,
        endDate: fd.get("endDate") as string,
        targetRevenue: fd.get("targetRevenue") as string,
        notes: (fd.get("notes") as string) || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Quota created");
          setSheetOpen(false);
        },
        onError: () => toast.error("Failed to create quota"),
      },
    );
  }

  return (
    <PageWrapper
      title="Sales Quotas"
      subtitle="Manage revenue targets per rep"
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Set Quota
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Target" value={fmt(totalTarget)} icon={Target} color="blue" />
          <StatCard label="Total Actual" value={fmt(totalActual)} icon={DollarSign} color="green" />
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
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotas set yet.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium text-sm">{q.userName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] capitalize">{q.period}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmt(q.targetRevenue)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(q.actualRevenue)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(q.attainmentPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums">{q.attainmentPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {q.startDate && q.endDate
                            ? `${format(new Date(q.startDate), "dd MMM")} – ${format(new Date(q.endDate), "dd MMM yyyy")}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Set Sales Quota</SheetTitle>
            <SheetDescription>Assign a revenue target to a team member.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Employee</Label>
              <Select name="userId" required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employeeList.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select name="period" defaultValue="monthly">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input type="date" name="startDate" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input type="date" name="endDate" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRevenue">Target Revenue (₹)</Label>
              <Input type="text" name="targetRevenue" placeholder="e.g. 500000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea name="notes" placeholder="Optional notes..." rows={2} />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createQuota.isPending}>
                {createQuota.isPending ? "Creating..." : "Create Quota"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
