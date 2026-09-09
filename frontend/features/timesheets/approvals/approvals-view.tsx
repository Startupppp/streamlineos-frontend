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
import { useSession } from "next-auth/react";
import { useAccess, useCan, usePermissionGate } from "@/hooks/api/access";
import {
  APPROVALS_PAGE_SIZE,
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
import { summarizeBorrowedAuthority } from "./approval-standing";
import { DelegateActingBanner } from "./delegate-acting-banner";
import { ApprovalsTabPanel, type ApprovalTab } from "./approvals-tab-panel";
import { ApprovalTabFilter } from "./approval-tab-filter";

export function ApprovalsView() {
  const canManage = useCan("timesheets:approvals:manage");
  /**
   * The list this page renders is `GET /timesheets/approvals`, whose guard is
   * `timesheets:approvals:view`. It was gated on `timesheets:team:view`, a
   * different key: a viewer holding approvals-view but not team-view was told
   * access was restricted, and one holding team-view but not approvals-view
   * got the page with a permanently empty table instead of a denial.
   */
  const access = usePermissionGate("timesheets:approvals:view");
  const { data: accessData } = useAccess();
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  const isOrgOwner = accessData?.isOrgOwner ?? false;
  const shouldReduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<ApprovalTab>("SUBMITTED");
  const [memberFilter, setMemberFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selection, setSelection] = useState<Set<string | number>>(new Set());
  const [detailPeriod, setDetailPeriod] = useState<TimesheetPeriod | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const canAccess = access.allowed;

  const sharedFilters = {
    userId: memberFilter !== "all" ? memberFilter : undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  };

  /**
   * Page 1 of the pending queue, deliberately keyed identically to what
   * `ApprovalsTabPanel` asks for on the Pending tab, so the two share one
   * cache entry rather than issuing two requests for the same rows. It powers
   * the pending count and the delegate banner, both of which have to be right
   * even while another tab is showing.
   */
  const { data: pendingData } = useApprovals(
    { status: "SUBMITTED", ...sharedFilters, page: 1, limit: APPROVALS_PAGE_SIZE },
    canAccess,
  );

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const employees: Employee[] = useMemo(
    () => unwrapEmployees(employeesRaw),
    [employeesRaw],
  );

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) map.set(emp.id, emp.name ?? emp.email ?? emp.id);
    return map;
  }, [employees]);

  const resolveApproverName = useCallback(
    (userId: string) => employeeNameById.get(userId) ?? "another approver",
    [employeeNameById],
  );

  const borrowedAuthority = useMemo(
    () => summarizeBorrowedAuthority(viewerId, isOrgOwner, pendingData?.data ?? []),
    [viewerId, isOrgOwner, pendingData],
  );

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

  if (access.denied) {
    return (
      <PageWrapper title="Approvals">
        <EmptyState
          illustrationPreset="approval"
          access={access}
          title="Access restricted"
          description="You don't have permission to view timesheet approvals."
        />
      </PageWrapper>
    );
  }

  const pageFilters = (
    <>
      <ApprovalTabFilter value={activeTab} onChange={handleTabSelect} />
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")} aria-label="Member">
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
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col gap-3">
        <DelegateActingBanner
          authority={borrowedAuthority}
          resolveName={resolveApproverName}
          className="shrink-0"
        />
        <div
          id="approvals-tabpanel"
          role="tabpanel"
          aria-labelledby={`approvals-tab-${activeTab}`}
          className="flex min-h-0 flex-1 flex-col"
        >
          <ApprovalsTabPanel status={activeTab} {...tabPanelProps} />
        </div>
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
