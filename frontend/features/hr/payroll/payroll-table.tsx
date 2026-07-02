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
import { cn } from "@/lib/utils";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { PayrollWithUser } from "@/types/hr";
import { useMemo, useState } from "react";

function StatusSummary({ payrolls }: { payrolls: PayrollWithUser[] }) {
  const counts = useMemo(() => {
    const acc = { DRAFT: 0, APPROVED: 0, PAID: 0 };
    for (const p of payrolls) {
      if (p.status === "DRAFT") acc.DRAFT++;
      else if (p.status === "APPROVED") acc.APPROVED++;
      else if (p.status === "PAID") acc.PAID++;
    }
    return acc;
  }, [payrolls]);

  return (
    <div className="flex items-center gap-1.5">
      {counts.DRAFT > 0 && (
        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-5 border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/30">
          {counts.DRAFT} Draft
        </Badge>
      )}
      {counts.APPROVED > 0 && (
        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-5 border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:bg-blue-950/30">
          {counts.APPROVED} Approved
        </Badge>
      )}
      {counts.PAID > 0 && (
        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/30">
          {counts.PAID} Paid
        </Badge>
      )}
    </div>
  );
}

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
    <TableRow className="hover:bg-muted/30 transition-colors duration-200">
      {showMonth && (
        <TableCell className="pl-6 whitespace-nowrap">
          <span className="text-xs font-medium text-muted-foreground">
            {format(new Date(payroll.month + "-01"), "MMM yyyy")}
          </span>
        </TableCell>
      )}
      {!showMonth && (
        <TableCell className="pl-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">
                {payroll.user?.firstName?.[0]}{payroll.user?.lastName?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium whitespace-nowrap text-foreground">
                {payroll.user?.firstName} {payroll.user?.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {payroll.user?.designation}
              </p>
            </div>
          </div>
        </TableCell>
      )}
      <TableCell className="text-right whitespace-nowrap font-mono tabular-nums text-sm text-foreground/80">
        ₹{parseFloat(payroll.grossSalary || "0").toLocaleString()}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap font-mono tabular-nums text-sm text-rose-600 dark:text-rose-400">
        -₹{parseFloat(payroll.deductions || "0").toLocaleString()}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap font-mono tabular-nums text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        ₹{parseFloat(payroll.netSalary || "0").toLocaleString()}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            getColorSafe(payrollStatusColors, payroll.status ?? "DRAFT"),
          )}
        >
          {payroll.status}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap hidden md:table-cell">
        <p className="text-xs text-muted-foreground">
          {payroll.createdAt ? format(new Date(payroll.createdAt), "MMM d, yyyy") : "—"}
        </p>
        {payroll.generatedByName && (
          <p className="text-[10px] text-muted-foreground/70">by {payroll.generatedByName}</p>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
        {payroll.approvedByName ?? "—"}
      </TableCell>
      <TableCell className="text-right pr-6">
        <div className="flex justify-end gap-1.5">
          {payroll.status === "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onApprove(payroll.id)}
              disabled={isApprovePending}
            >
              <Check className="h-3 w-3" />
              Approve
            </Button>
          )}
          {payroll.status === "APPROVED" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onMarkPaid(payroll.id)}
              disabled={isMarkPaidPending}
            >
              <CreditCard className="h-3 w-3" />
              Mark Paid
            </Button>
          )}
          {(payroll.status === "APPROVED" || payroll.status === "PAID") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onPreview?.(payroll)}
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
          )}
          {payroll.status === "PAID" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onDownload?.(payroll.id)}
            >
              <Download className="h-3 w-3" />
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
  const initials = employeeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <TableRow
        className="bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors duration-200"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell colSpan={9} className="pl-6 py-2.5">
          <div className="flex items-center gap-2.5">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400">
                {initials}
              </span>
            </div>
            <span className="font-semibold text-sm text-foreground">{employeeName}</span>
            {designation && (
              <span className="text-xs text-muted-foreground">· {designation}</span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                {records.length} month{records.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                ₹{totalNet.toLocaleString()}
              </span>
            </div>
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
    <Card className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground truncate">{title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Manage payroll status and generate payslips
              </CardDescription>
            </div>
          </div>
          <StatusSummary payrolls={payrolls} />
        </div>
      </CardHeader>
      <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
        {payrolls.length > 0 ? (
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-[800px]">
              <Table className="[&_th]:py-3 [&_td]:py-3">
                <caption className="sr-only">Payroll records</caption>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {groupByEmployee ? "Month" : "Employee"}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Gross Salary
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Deductions
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Net Salary
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Generated
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Approved By
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </TableHead>
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
          <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] py-12 px-4">
            <EmptyExpensesIllustration className="mx-auto mb-4 w-32 h-32 opacity-70" />
            <p className="text-sm font-semibold text-foreground">No payroll records</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &ldquo;Generate All&rdquo; to create payroll for all employees
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
