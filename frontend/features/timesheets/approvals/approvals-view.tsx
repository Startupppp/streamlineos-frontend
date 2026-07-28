"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCan } from "@/hooks/api/access";
import {
  useApprovals,
  useBulkApprove,
  useBulkReject,
} from "@/hooks/api/timesheets-core/approvals";
import { useHrEmployees, unwrapEmployees } from "@/hooks/api/hr";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import type { Employee } from "@/types/hr";
import { cn } from "@/lib/utils";
import { BulkRejectDialog } from "./bulk-reject-dialog";
import { ApprovalDetailSheet } from "./approval-detail-sheet";
import {
  ALL_APPROVAL_TABS,
  APPROVAL_TAB_LABEL,
  ApprovalsTabPanel,
  type ApprovalTab,
} from "./approvals-tab-panel";

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

  const sharedFilters = {
    userId: memberFilter !== "all" ? memberFilter : undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  };

  const { data: pendingData } = useApprovals(
    { status: "SUBMITTED", ...sharedFilters },
    canAccess,
  );

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const employees: Employee[] = unwrapEmployees(employeesRaw);

  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const pendingCount = pendingData?.pagination.total ?? 0;

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

  const handleDateRangeChange = useCallback(
    ({ from, to }: { from: string; to: string }) => {
      setDateFrom(from);
      setDateTo(to);
    },
    [],
  );

  const handleTabSelect = useCallback((tab: ApprovalTab) => {
    setActiveTab(tab);
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
      <PageWrapper title="Approvals">
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
      {ALL_APPROVAL_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => handleTabSelect(tab)}
          className={cn(
            "shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeTab === tab
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {APPROVAL_TAB_LABEL[tab]}
        </button>
      ))}
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")}>
          <SelectValue placeholder="All members" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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

  const tabPanelProps = {
    memberFilter,
    dateFrom,
    dateTo,
    canAccess,
    canManage,
    selection,
    onSelectionChange: setSelection,
    onRowClick: handleRowClick,
    onBulkApprove: handleBulkApprove,
    onBulkReject: handleBulkRejectOpen,
    isBulkPending,
  };

  return (
    <PageWrapper
      title="Approvals"
      subtitle={subtitle}
      filters={pageFilters}
    >
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col">
        {activeTab === "SUBMITTED" && (
          <ApprovalsTabPanel status="SUBMITTED" {...tabPanelProps} />
        )}
        {activeTab === "APPROVED" && (
          <ApprovalsTabPanel status="APPROVED" {...tabPanelProps} />
        )}
        {activeTab === "REJECTED" && (
          <ApprovalsTabPanel status="REJECTED" {...tabPanelProps} />
        )}
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
