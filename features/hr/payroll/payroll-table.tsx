"use client";

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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Check, CreditCard, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { PayrollWithUser } from "@/types/hr";

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  selectedMonth: string;
  onApprove: (payrollId: number) => void;
  onMarkPaid: (payrollId: number) => void;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  onDownload?: (payrollId: number) => void;
  onPreview?: (payroll: PayrollWithUser) => void;
}

export function PayrollTable({
  payrolls,
  selectedMonth,
  onApprove,
  onMarkPaid,
  isApprovePending,
  isMarkPaidPending,
  onDownload,
  onPreview,
}: PayrollTableProps) {
  return (
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
            <div className="min-w-[640px]">
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
                        ₹{parseFloat(payroll.grossSalary || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="text-destructive whitespace-nowrap">
                        -₹{parseFloat(payroll.deductions || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ₹{parseFloat(payroll.netSalary || "0").toLocaleString()}
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
                        <div className="flex justify-end gap-2">
                          {payroll.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onApprove(payroll.id)}
                              disabled={isApprovePending}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {payroll.status === "APPROVED" && (
                            <Button
                              size="sm"
                              onClick={() => onMarkPaid(payroll.id)}
                              disabled={isMarkPaidPending}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {(payroll.status === "APPROVED" || payroll.status === "PAID") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onPreview?.(payroll)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                          )}
                          {payroll.status === "PAID" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDownload?.(payroll.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
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
  );
}
