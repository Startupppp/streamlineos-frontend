"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { useTeamWeekSummary } from "@/hooks/api/timesheets-core/team";
import { useReportsOverview } from "@/hooks/api/timesheets-core/reports";
import { PERIOD_STATUS_LABEL } from "@/features/timesheets/types";
import type { PeriodStatus } from "@/features/timesheets/types";
import { TeamStats } from "./team-stats";
import { TeamTable, type TeamMemberRow } from "./team-table";
import { MemberDetailSheet } from "./member-detail-sheet";

const PERIOD_STATUSES: PeriodStatus[] = [
  "OPEN",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "LOCKED",
  "REOPENED",
];

function getWeekBounds(offset: number) {
  const base = addWeeks(new Date(), offset);
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });
  return {
    weekStart,
    weekEnd,
    startStr: format(weekStart, "yyyy-MM-dd"),
    endStr: format(weekEnd, "yyyy-MM-dd"),
  };
}

export function TeamView() {
  const canView = useCan("timesheets:team:view");
  const shouldReduceMotion = useReducedMotion();

  const [weekOffset, setWeekOffset] = useState(0);
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<TeamMemberRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { weekStart, weekEnd, startStr, endStr } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset],
  );

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useTeamWeekSummary([], startStr, endStr, canView);

  const { data: overview, isLoading: overviewLoading } = useReportsOverview(
    { startDate: startStr, endDate: endStr },
    canView,
  );

  const allRows = useMemo<TeamMemberRow[]>(
    () =>
      (summaryData?.summaries ?? []).map((summary) => {
        const period = summary.period ?? null;
        const status: TeamMemberRow["status"] = period?.status ?? "MISSING";
        return {
          userId: summary.userId,
          name: summary.name ?? "",
          email: summary.email ?? "",
          period,
          totalHours: summary.totalHours,
          dailyHours: summary.dailyHours,
          status,
        };
      }),
    [summaryData],
  );

  const filteredRows = useMemo<TeamMemberRow[]>(() => {
    let rows = allRows;
    if (memberFilter !== "all") rows = rows.filter((r) => r.userId === memberFilter);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [allRows, memberFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalHours =
      overview?.totalHours ??
      filteredRows.reduce((s, r) => s + r.totalHours, 0);
    const billableHours = overview?.billableHours ?? 0;
    const billablePercent = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    const submittedCount = filteredRows.filter(
      (r) => r.status === "SUBMITTED" || r.status === "APPROVED",
    ).length;
    const missingCount = filteredRows.filter(
      (r) => r.status === "MISSING" || r.status === "OPEN" || r.status === "DRAFT",
    ).length;
    return { totalHours, billablePercent, submittedCount, missingCount };
  }, [filteredRows, overview]);

  const handleRowClick = useCallback((row: TeamMemberRow) => {
    setSelectedRow(row);
    setDetailOpen(true);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setSelectedRow(null);
  }, []);

  const handlePrevWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const handleNextWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const handleThisWeek = useCallback(() => setWeekOffset(0), []);
  const handleRetry = useCallback(() => { void refetchSummary(); }, [refetchSummary]);

  const subtitle = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")} · ${allRows.length} member${allRows.length === 1 ? "" : "s"}`;

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  if (!canView) {
    return (
      <PageWrapper title="Team Time">
        <EmptyState
          illustrationPreset="team"
          title="Access restricted"
          description="You don't have permission to view team time data."
        />
      </PageWrapper>
    );
  }

  const weekNavActions = (
    <div className="flex items-center gap-1">
      <AnimatedIconButton
        icon={ChevronLeftIcon}
        iconSize={16}
        variant="outline"
        size="icon"
        onClick={handlePrevWeek}
        aria-label="Previous week"
      />
      {weekOffset !== 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleThisWeek}
        >
          This week
        </Button>
      )}
      <AnimatedIconButton
        icon={ChevronRightIcon}
        iconSize={16}
        variant="outline"
        size="icon"
        onClick={handleNextWeek}
        aria-label="Next week"
      />
    </div>
  );

  const pageFilters = (
    <>
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")}>
          <SelectValue placeholder="All members" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All members</SelectItem>
          {allRows.map((emp) => (
            <SelectItem key={emp.userId} value={emp.userId}>
              {emp.name || emp.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-40")}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {PERIOD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {PERIOD_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PageWrapper
      title="Team Time"
      subtitle={subtitle}
      actions={weekNavActions}
      filters={pageFilters}
    >
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col space-y-4">
        <TeamStats
          totalHours={stats.totalHours}
          billablePercent={stats.billablePercent}
          submittedCount={stats.submittedCount}
          missingCount={stats.missingCount}
          isLoading={summaryLoading || overviewLoading}
        />

        {summaryError ? (
          <ErrorState
            title="Couldn't load team timesheets"
            description="Something went wrong while fetching team data."
            onRetry={handleRetry}
            className="min-h-[30dvh]"
          />
        ) : (
          <TeamTable
            rows={filteredRows}
            weekStart={weekStart}
            isLoading={summaryLoading}
            onRowClick={handleRowClick}
          />
        )}
      </motion.div>

      <MemberDetailSheet
        period={selectedRow?.period ?? null}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        memberName={selectedRow?.name || selectedRow?.email || ""}
      />
    </PageWrapper>
  );
}
