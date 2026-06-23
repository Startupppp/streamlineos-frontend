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
import { Check, CreditCard, Download, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { PayrollWithUser } from "@/types/hr";
import { useMemo, useState } from "react";

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  title: string;
  groupByEmployee?: boolean;
  onApprove: (payrollId: number) => void;
  onMarkPaid: (payrollId: number) => void;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  onDownload?: (payrollId: number) => void;
  onPreview?: (payroll: PayrollWithUser) => void;
}

function PayrollRow({
  payroll,
  showMonth,
  onApprove,
  onMarkPaid,
  isApprovePending,
  isMarkPaidPending,
  onDownload,
  onPreview,
}: {
  payroll: PayrollWithUser;
  showMonth: boolean;
  onApprove: (id: number) => void;
  onMarkPaid: (id: number) => void;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  onDownload?: (id: number) => void;
  onPreview?: (p: PayrollWithUser) => void;
}) {
  return (
    <TableRow>
      {showMonth && (
        <TableCell className="pl-4 whitespace-nowrap text-xs text-muted-foreground">
          {format(new Date(payroll.month + "-01"), "MMM yyyy")}
        </TableCell>
      )}
      {!showMonth && (
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
      )}
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
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
        {payroll.createdAt ? format(new Date(payroll.createdAt), "MMM d, yyyy") : "—"}
        {payroll.generatedByName && (
          <span className="block text-[10px]">by {payroll.generatedByName}</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
        {payroll.approvedByName ?? "—"}
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
  );
}

function EmployeeGroup({
  employeeName,
  designation,
  records,
  onApprove,
  onMarkPaid,
  isApprovePending,
  isMarkPaidPending,
  onDownload,
  onPreview,
}: {
  employeeName: string;
  designation: string | null | undefined;
  records: PayrollWithUser[];
  onApprove: (id: number) => void;
  onMarkPaid: (id: number) => void;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  onDownload?: (id: number) => void;
  onPreview?: (p: PayrollWithUser) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalNet = records.reduce((s, r) => s + parseFloat(r.netSalary || "0"), 0);

  return (
    <>
      <TableRow
        className="bg-muted/40 cursor-pointer hover:bg-muted/60"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell colSpan={9} className="pl-4 py-2">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-sm">{employeeName}</span>
            {designation && (
              <span className="text-xs text-muted-foreground">• {designation}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {records.length} month{records.length !== 1 ? "s" : ""} · Total net: ₹{totalNet.toLocaleString()}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {expanded &&
        records.map((r) => (
          <PayrollRow
            key={r.id}
            payroll={r}
            showMonth
            onApprove={onApprove}
            onMarkPaid={onMarkPaid}
            isApprovePending={isApprovePending}
            isMarkPaidPending={isMarkPaidPending}
            onDownload={onDownload}
            onPreview={onPreview}
          />
        ))}
    </>
  );
}

export function PayrollTable({
  payrolls,
  title,
  groupByEmployee = false,
  onApprove,
  onMarkPaid,
  isApprovePending,
  isMarkPaidPending,
  onDownload,
  onPreview,
}: PayrollTableProps) {
  const grouped = useMemo(() => {
    if (!groupByEmployee) return null;
    const map = new Map<string, PayrollWithUser[]>();
    for (const p of payrolls) {
      const key = p.userId;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([, records]) => ({
      employeeName: `${records[0].user?.firstName ?? ""} ${records[0].user?.lastName ?? ""}`.trim(),
      designation: records[0].user?.designation,
      records: records.sort((a, b) => a.month.localeCompare(b.month)),
    }));
  }, [payrolls, groupByEmployee]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Manage payroll status and generate payslips
        </CardDescription>
      </CardHeader>
      <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
        {payrolls.length > 0 ? (
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-[800px]">
              <Table className="[&_th]:py-3 [&_td]:py-3">
                <caption className="sr-only">Payroll records</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">
                      {groupByEmployee ? "Month" : "Employee"}
                    </TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Generated</TableHead>
                    <TableHead className="hidden lg:table-cell">Approved By</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupByEmployee && grouped
                    ? grouped.map((g) => (
                        <EmployeeGroup
                          key={g.records[0].userId}
                          employeeName={g.employeeName}
                          designation={g.designation}
                          records={g.records}
                          onApprove={onApprove}
                          onMarkPaid={onMarkPaid}
                          isApprovePending={isApprovePending}
                          isMarkPaidPending={isMarkPaidPending}
                          onDownload={onDownload}
                          onPreview={onPreview}
                        />
                      ))
                    : payrolls.map((payroll) => (
                        <PayrollRow
                          key={payroll.id}
                          payroll={payroll}
                          showMonth={false}
                          onApprove={onApprove}
                          onMarkPaid={onMarkPaid}
                          isApprovePending={isApprovePending}
                          isMarkPaidPending={isMarkPaidPending}
                          onDownload={onDownload}
                          onPreview={onPreview}
                        />
                      ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center px-4 py-12 text-muted-foreground">
            <EmptyExpensesIllustration className="mx-auto mb-4 w-40 h-40" />
            <p>No payroll records for this period</p>
            <p className="text-sm">
              Click &ldquo;Generate All&rdquo; to create payroll for all employees
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
