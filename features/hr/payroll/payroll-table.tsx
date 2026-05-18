"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Check, CreditCard, Download, Eye, Mail, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { PayrollWithUser } from "@/types/hr";

function fmtInr(value: string | number | null | undefined): string {
  const n = Math.round(parseFloat(String(value ?? "0")) || 0);
  return n.toLocaleString("en-IN");
}

function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy, hh:mm a");
}

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  selectedMonth: string;
  year: string;
  month: string;
  employeeFilter: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onEmployeeFilterChange: (value: string) => void;
  onPreview: (payroll: PayrollWithUser) => void;
  onApprove: (payrollId: number) => void;
  onMarkPaid: (payrollId: number) => void;
  onDelete: (payrollId: number) => void;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  isDeletePending: boolean;
  onDownload?: (payrollId: number) => void;
  onResendEmail?: (payrollId: number) => void;
  isResendPending?: boolean;
}

export function PayrollTable({
  payrolls,
  selectedMonth,
  year,
  month,
  employeeFilter,
  onYearChange,
  onMonthChange,
  onEmployeeFilterChange,
  onPreview,
  onApprove,
  onMarkPaid,
  onDelete,
  isApprovePending,
  isMarkPaidPending,
  isDeletePending,
  onDownload,
  onResendEmail,
  isResendPending,
}: PayrollTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<PayrollWithUser | null>(null);
  const selectedMonthKey = `${year}-${month}`;
  const payrollRows = payrolls.filter((p) => {
    if (p.month !== selectedMonthKey) return false;
    if (employeeFilter === "all") return true;
    const fullName = `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim();
    return fullName === employeeFilter;
  });
  const selectedMonthDate = new Date(`${selectedMonthKey}-01`);
  const selectedMonthLabel = Number.isNaN(selectedMonthDate.getTime())
    ? selectedMonth
    : format(selectedMonthDate, "MMMM yyyy");
  const createdYears = Array.from(
    new Set(
      payrolls
        .map((p) => p.month?.slice(0, 4))
        .filter((v): v is string => Boolean(v))
    )
  ).sort((a, b) => b.localeCompare(a));
  const yearOptions = Array.from(new Set([year, ...createdYears]));
  const employeeOptions = Array.from(
    new Set(
      payrolls
        .map((p) => `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Payroll for {selectedMonthLabel}
          </CardTitle>
          <CardDescription>
            Manage payroll status and generate payslips
          </CardDescription>
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeFilter}
              onChange={(e) => onEmployeeFilterChange(e.target.value)}
            >
              <option value="all">All employees</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
          {payrollRows.length > 0 ? (
            <ScrollArea className="w-full max-h-[60vh]" type="auto">
              <div className="min-w-[720px]">
                <Table className="[&_th]:py-3 [&_td]:py-3">
                  <caption className="sr-only">Payroll records for selected month</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Employee</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="pl-4">
                          <div>
                            <p className="font-medium whitespace-nowrap">
                              {payroll.user?.firstName} {payroll.user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payroll.user?.designation}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Created: {fmtDateTime(payroll.createdAt)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Approved: {fmtDateTime(payroll.approvedAt)} | Paid: {fmtDateTime(payroll.paidAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          ₹{fmtInr(payroll.grossSalary)}
                        </TableCell>
                        <TableCell className="text-destructive whitespace-nowrap">
                          -₹{fmtInr(payroll.deductions)}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{fmtInr(payroll.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getColorSafe(payrollStatusColors, payroll.status ?? "DRAFT")}
                          >
                            {payroll.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => onPreview(payroll)}
                            >
                              <Eye className="h-3 w-3 shrink-0" aria-hidden />
                              Preview
                            </Button>
                            {payroll.status === "DRAFT" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteTarget(payroll)}
                                disabled={isDeletePending}
                              >
                                <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
                                Delete
                              </Button>
                            )}
                            {payroll.status === "DRAFT" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => onApprove(payroll.id)}
                                disabled={isApprovePending}
                              >
                                <Check className="h-3 w-3 shrink-0" aria-hidden />
                                Approve
                              </Button>
                            )}
                            {payroll.status === "APPROVED" && (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => onMarkPaid(payroll.id)}
                                disabled={isMarkPaidPending}
                              >
                                <CreditCard className="h-3 w-3 shrink-0" aria-hidden />
                                Mark Paid
                              </Button>
                            )}
                            {payroll.status === "PAID" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => onDownload?.(payroll.id)}
                              >
                                <Download className="h-3 w-3 shrink-0" aria-hidden />
                                Download
                              </Button>
                            )}
                            {payroll.status === "PAID" && onResendEmail && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => onResendEmail(payroll.id)}
                                disabled={isResendPending}
                                title="Resend the payslip email to this employee"
                              >
                                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                                Resend
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center px-4 py-12 text-muted-foreground">
              <EmptyExpensesIllustration className="mx-auto mb-4 w-40 h-40" />
              <p>No payroll records for this month</p>
              <p className="text-sm">
                Click &ldquo;Generate All&rdquo; to create payroll for all employees
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payroll record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the draft payroll for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.user?.firstName} {deleteTarget?.user?.lastName}
              </span>{" "}
              ({selectedMonthLabel}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletePending}
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
