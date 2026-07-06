"use client";

import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import {
  useApprovals,
  useBulkApprove,
  useBulkReject,
} from "@/hooks/api/timesheets-core/approvals";
import { useHrEmployees } from "@/hooks/api/hr";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets-core/types";
import type { TimesheetPeriod } from "@/features/timesheets-core/types";
import type { Employee } from "@/types/hr";
import { cn } from "@/lib/utils";
import { BulkRejectDialog } from "./bulk-reject-dialog";
import { ApprovalDetailSheet } from "./approval-detail-sheet";

type ApprovalTab = "SUBMITTED" | "APPROVED" | "REJECTED";

const ALL_TABS: ApprovalTab[] = ["SUBMITTED", "APPROVED", "REJECTED"];

const TAB_LABEL: Record<ApprovalTab, string> = {
  SUBMITTED: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const TAB_EMPTY: Record<ApprovalTab, string> = {
  SUBMITTED: "No timesheets awaiting approval.",
  APPROVED: "No approved timesheets for this period.",
  REJECTED: "No rejected timesheets for this period.",
};

interface ApprovalsTableProps {
  periods: TimesheetPeriod[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRowClick: (period: TimesheetPeriod) => void;
  selection: Set<string | number>;
  onSelectionChange: (sel: Set<string | number>) => void;
  canManage: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  tab: ApprovalTab;
  isBulkPending: boolean;
}

function ApprovalsTable({
  periods,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  selection,
  onSelectionChange,
  canManage,
  onBulkApprove,
  onBulkReject,
  tab,
  isBulkPending,
}: ApprovalsTableProps) {
  const columns = useMemo<DataTableColumn<TimesheetPeriod>[]>(
    () => [
      {
        key: "member",
        header: "Member",
        cell: (row) => (
          <div>
            <p className="text-[11px] font-medium">
              {row.user?.name ?? row.user?.email ?? row.userId}
            </p>
            {row.user?.name && (
              <p className="text-[10px] text-muted-foreground">{row.user.email}</p>
            )}
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.user?.name ?? row.user?.email ?? "",
      },
      {
        key: "period",
        header: "Period",
        cell: (row) => (
          <span className="text-[11px] tabular-nums">
            {format(parseISO(row.periodStart), "MMM d")} –{" "}
            {format(parseISO(row.periodEnd), "MMM d")}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.periodStart,
      },
      {
        key: "totalHours",
        header: "Hours",
        headerClassName: "text-right",
        className: "text-right tabular-nums",
        cell: (row) => `${parseFloat(row.totalHours).toFixed(1)}h`,
        sortable: true,
        sortValue: (row) => parseFloat(row.totalHours),
      },
      {
        key: "billableHours",
        header: "Billable",
        headerClassName: "text-right",
        className: "text-right tabular-nums",
        cell: (row) => `${parseFloat(row.billableHours).toFixed(1)}h`,
      },
      {
        key: "submittedAt",
        header: "Submitted",
        cell: (row) =>
          row.submittedAt ? (
            <span className="text-[11px] text-muted-foreground">
              {format(parseISO(row.submittedAt), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          ),
        sortable: true,
        sortValue: (row) => row.submittedAt ?? "",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            className={cn(
              "text-[10px] border px-1.5 py-0",
              PERIOD_STATUS_BADGE[row.status],
            )}
          >
            {PERIOD_STATUS_LABEL[row.status]}
          </Badge>
        ),
      },
    ],
    [],
  );

  const toolbar =
    canManage && selection.size > 0 && tab === "SUBMITTED" ? (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {selection.size} selected
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={onBulkApprove}
          disabled={isBulkPending}
        >
          <CheckCircle className="h-3 w-3 text-emerald-600" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 border-destructive/40 text-destructive"
          onClick={onBulkReject}
          disabled={isBulkPending}
        >
          <XCircle className="h-3 w-3" />
          Reject
        </Button>
      </div>
    ) : undefined;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load approvals"
        description="Something went wrong loading timesheet approvals."
        onRetry={onRetry}
        className="min-h-[30vh]"
      />
    );
  }

  return (
    <DataTable
      data={periods}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      selection={
        canManage && tab === "SUBMITTED"
          ? { selected: selection, onChange: onSelectionChange }
          : undefined
      }
      isLoading={isLoading}
      toolbar={toolbar}
      minWidth="700px"
      emptyState={
        <EmptyState
          illustrationPreset="approval"
          title="No timesheets"
          description={TAB_EMPTY[tab]}
          compact
        />
      }
    />
  );
}

export function ApprovalsView() {
  const canManage = useCan("timesheets:approvals:manage");
  const canView = useCan("timesheets:team:view");
  const shouldReduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<ApprovalTab>("SUBMITTED");
  const [memberFilter, setMemberFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selection, setSelection] = useState<Set<string | number>>(new Set());
  const [detailPeriod, setDetailPeriod] = useState<TimesheetPeriod | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const canAccess = canView || canManage;

  const approvalQuery = {
    status: activeTab,
    userId: memberFilter !== "all" ? memberFilter : undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  };

  const {
    data: periods,
    isLoading,
    isError,
    refetch,
  } = useApprovals(approvalQuery, canAccess);

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const employees: Employee[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : employeesRaw?.data ?? [];

  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const pendingCount = periods?.length ?? 0;

  const handleRowClick = useCallback((period: TimesheetPeriod) => {
    setDetailPeriod(period);
    setDetailOpen(true);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailPeriod(null);
  }, []);

  const handleBulkApprove = useCallback(() => {
    const ids = [...selection].map(Number);
    bulkApproveMutation.mutate(ids, {
      onSuccess: () => setSelection(new Set()),
    });
  }, [selection, bulkApproveMutation]);

  const handleBulkRejectOpen = useCallback(() => setBulkRejectOpen(true), []);

  const handleBulkRejectConfirm = useCallback(
    (reason: string) => {
      const ids = [...selection].map(Number);
      bulkRejectMutation.mutate(
        { periodIds: ids, reason },
        {
          onSuccess: () => {
            setSelection(new Set());
            setBulkRejectOpen(false);
          },
        },
      );
    },
    [selection, bulkRejectMutation],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleDateRangeChange = useCallback(
    ({ from, to }: { from: string; to: string }) => {
      setDateFrom(from);
      setDateTo(to);
    },
    [],
  );

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val as ApprovalTab);
    setSelection(new Set());
  }, []);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const subtitle = useMemo(() => {
    if (activeTab === "SUBMITTED" && pendingCount > 0)
      return `${pendingCount} pending approval`;
    return undefined;
  }, [activeTab, pendingCount]);

  if (!canAccess) {
    return (
      <PageWrapper title="Approvals" eyebrow="Timesheets">
        <EmptyState
          illustrationPreset="approval"
          title="Access restricted"
          description="You don't have permission to view timesheet approvals."
        />
      </PageWrapper>
    );
  }

  const pageFilters = (
    <>
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className="h-8 text-xs w-44">
          <SelectValue placeholder="All members" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All members</SelectItem>
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.name ?? emp.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DateRangePicker
        from={dateFrom || undefined}
        to={dateTo || undefined}
        onChange={handleDateRangeChange}
        placeholder="Pick a date range"
      />
    </>
  );

  const isBulkPending =
    bulkApproveMutation.isPending || bulkRejectMutation.isPending;

  return (
    <PageWrapper
      title="Approvals"
      eyebrow="Timesheets"
      subtitle={subtitle}
      filters={pageFilters}
    >
      <motion.div {...motionProps} className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-8">
            {ALL_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="text-xs h-7">
                {TAB_LABEL[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          {ALL_TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <ApprovalsTable
                    periods={periods ?? []}
                    isLoading={isLoading}
                    isError={isError}
                    onRetry={handleRetry}
                    onRowClick={handleRowClick}
                    selection={selection}
                    onSelectionChange={setSelection}
                    canManage={canManage}
                    onBulkApprove={handleBulkApprove}
                    onBulkReject={handleBulkRejectOpen}
                    tab={tab}
                    isBulkPending={isBulkPending}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      <ApprovalDetailSheet
        period={detailPeriod}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />

      <BulkRejectDialog
        open={bulkRejectOpen}
        count={selection.size}
        onOpenChange={setBulkRejectOpen}
        onConfirm={handleBulkRejectConfirm}
        isPending={bulkRejectMutation.isPending}
      />
    </PageWrapper>
  );
}
