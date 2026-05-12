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

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  selectedMonth: string;
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Payroll for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </CardTitle>
          <CardDescription>
            Manage payroll status and generate payslips
          </CardDescription>
        </CardHeader>
        <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
          {payrolls.length > 0 ? (
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
                    {payrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="pl-4">
                          <div>
                            <p className="font-medium whitespace-nowrap">
                              {payroll.user?.firstName} {payroll.user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payroll.user?.designation}
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
              ({format(new Date(selectedMonth + "-01"), "MMMM yyyy")}). This cannot be undone.
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
