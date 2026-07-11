"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { SourceRefsPopover } from "./source-refs-popover";
import {
  useAttendanceSnapshot,
  useLeaveSnapshot,
  useOvertimeSnapshot,
  useReimbursementSnapshot,
  usePayrollAdjustments,
  useApprovePayrollAdjustment,
  type PayrollInputSnapshot,
  type PayrollAdjustment,
} from "@/hooks/api/payroll/payroll-inputs";
import { LoadingButton } from "@/components/ui/loading-button";

function resolveDisplayName(row: PayrollInputSnapshot | PayrollAdjustment): string {
  return getUserDisplayName({
    name: row.userName,
    firstName: row.userFirstName,
    lastName: row.userLastName,
    email: row.userEmail,
  });
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 h-8 items-center px-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function PaginationRow({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-6 px-2" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-6 px-2" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function AttendanceTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAttendanceSnapshot(periodId, { page, limit: 25 });
  if (isLoading) return <TableSkeleton cols={6} />;
  const rows = data?.data ?? [];
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Payable</TableHead>
            <TableHead className="text-right">Present</TableHead>
            <TableHead className="text-right">Absent</TableHead>
            <TableHead className="text-right">Late</TableHead>
            <TableHead className="text-right">OT (min)</TableHead>
            <TableHead className="w-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const p = row.payload as { payableDays?: number; presentDays?: number; absentDays?: number; lateCount?: number; overtimeMinutes?: number };
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm">{resolveDisplayName(row)}</TableCell>
                <TableCell className="text-right text-sm">{p.payableDays ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.presentDays ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.absentDays ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.lateCount ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.overtimeMinutes ?? 0}</TableCell>
                <TableCell><SourceRefsPopover refs={row.sourceRefs} /></TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">No data — build the period first</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationRow page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

function LeaveTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLeaveSnapshot(periodId, { page, limit: 25 });
  if (isLoading) return <TableSkeleton cols={5} />;
  const rows = data?.data ?? [];
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Paid Leave</TableHead>
            <TableHead className="text-right">Unpaid</TableHead>
            <TableHead className="text-right">Half Days</TableHead>
            <TableHead className="text-right">Encashment</TableHead>
            <TableHead className="w-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const p = row.payload as { paidLeaveDays?: number; unpaidLeaveDays?: number; halfDayCount?: number; encashmentDays?: number };
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm">{resolveDisplayName(row)}</TableCell>
                <TableCell className="text-right text-sm">{p.paidLeaveDays ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.unpaidLeaveDays ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.halfDayCount ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{p.encashmentDays ?? 0}</TableCell>
                <TableCell><SourceRefsPopover refs={row.sourceRefs} /></TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">No data — build the period first</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationRow page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

function OvertimeTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOvertimeSnapshot(periodId, { page, limit: 25 });
  if (isLoading) return <TableSkeleton cols={3} />;
  const rows = data?.data ?? [];
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Approved Requests</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead className="w-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const p = row.payload as { approvedRequests?: unknown[]; totalHours?: number };
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm">{resolveDisplayName(row)}</TableCell>
                <TableCell className="text-right text-sm">{p.approvedRequests?.length ?? 0}</TableCell>
                <TableCell className="text-right text-sm">{(p.totalHours ?? 0).toFixed(1)}h</TableCell>
                <TableCell><SourceRefsPopover refs={row.sourceRefs} /></TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No approved overtime this period</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationRow page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

function ReimbursementsTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReimbursementSnapshot(periodId, { page, limit: 25 });
  if (isLoading) return <TableSkeleton cols={3} />;
  const rows = data?.data ?? [];
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="w-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const p = row.payload as { items?: unknown[]; totalAmount?: number };
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm">{resolveDisplayName(row)}</TableCell>
                <TableCell className="text-right text-sm">{p.items?.length ?? 0}</TableCell>
                <TableCell className="text-right text-sm">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p.totalAmount ?? 0)}
                </TableCell>
                <TableCell><SourceRefsPopover refs={row.sourceRefs} /></TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No approved reimbursements this period</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationRow page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

const ADJ_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  applied: "bg-blue-50 text-blue-700 border-blue-200",
};

function AdjustmentsTab({ periodId, isLocked }: { periodId: number; isLocked: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayrollAdjustments(periodId, { page, limit: 25 });
  const approve = useApprovePayrollAdjustment();
  const rows = data?.data ?? [];
  if (isLoading) return <TableSkeleton cols={5} />;
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            {!isLocked && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-sm">{resolveDisplayName(row)}</TableCell>
              <TableCell className="text-sm capitalize">{row.adjustmentType}</TableCell>
              <TableCell className="text-sm capitalize">{row.section.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-sm max-w-48 truncate">{row.reason}</TableCell>
              <TableCell>
                <Badge variant="outline" className={ADJ_STATUS_STYLES[row.status] ?? ""}>
                  {row.status}
                </Badge>
              </TableCell>
              {!isLocked && (
                <TableCell>
                  {row.status === "pending" && (
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      isPending={approve.isPending}
                      onClick={() => approve.mutate(row.id)}
                    >
                      Approve
                    </LoadingButton>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={isLocked ? 5 : 6} className="text-center text-muted-foreground text-sm py-6">
                No adjustments for this period
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationRow page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

interface InputsSectionTabsProps {
  periodId: number;
  isLocked: boolean;
  onCreateAdjustment: () => void;
}

export function InputsSectionTabs({ periodId, isLocked, onCreateAdjustment }: InputsSectionTabsProps) {
  return (
    <Tabs defaultValue="attendance">
      <div className="flex items-center justify-between mb-3">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs">Leave</TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs">Overtime</TabsTrigger>
          <TabsTrigger value="reimbursements" className="text-xs">Reimbursements</TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs">Adjustments</TabsTrigger>
        </TabsList>
        {!isLocked && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onCreateAdjustment}>
            <Plus className="h-3 w-3" />
            Add Adjustment
          </Button>
        )}
      </div>
      <TabsContent value="attendance" className="mt-0">
        <AttendanceTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="leave" className="mt-0">
        <LeaveTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="overtime" className="mt-0">
        <OvertimeTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="reimbursements" className="mt-0">
        <ReimbursementsTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="adjustments" className="mt-0">
        <AdjustmentsTab periodId={periodId} isLocked={isLocked} />
      </TabsContent>
    </Tabs>
  );
}
