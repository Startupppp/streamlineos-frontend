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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Check, CreditCard, Download } from "lucide-react";
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
}

export function PayrollTable({
  payrolls,
  selectedMonth,
  onApprove,
  onMarkPaid,
  isApprovePending,
  isMarkPaidPending,
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
      <CardContent aria-live="polite">
        {payrolls.length > 0 ? (
          <Table>
            <caption className="sr-only">Payroll records for selected month</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {payroll.user?.firstName} {payroll.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payroll.user?.designation}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    ₹{parseFloat(payroll.grossSalary || "0").toLocaleString()}
                  </TableCell>
                  <TableCell className="text-red-600">
                    -₹{parseFloat(payroll.deductions || "0").toLocaleString()}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
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
                  <TableCell className="text-right">
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
                      {payroll.status === "PAID" && (
                        <Button size="sm" variant="ghost">
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
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <EmptyExpensesIllustration className="mx-auto mb-4 w-40 h-40" />
            <p>No payroll records for this month</p>
            <p className="text-sm">
              Click &quot;Generate All&quot; to create payroll for all employees
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
