"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock, BellRing, Users } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/ui/data-table";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { usePermissionGate, useScope } from "@/hooks/api/access";
import {
  OVERDUE_PAGE_SIZE,
  useOverduePeriods,
} from "@/hooks/api/timesheets-core/overdue";
import type { OverduePeriod } from "@/features/timesheets/types";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { buildOverdueColumns } from "./overdue-columns";

const ALL = "all";

function getOverdueRowKey(row: OverduePeriod) {
  return row.periodId;
}

/**
 * TS-11. Who is late, and what the system has already done about it.
 *
 * `GET /timesheets/periods/overdue` shipped with no caller. The grace days and
 * reminder thresholds were read by the nightly sweep to decide whom to email
 * and by nothing else, so the only person who ever learned a timesheet was
 * late was the person who owed it — an approver had no list to work from and
 * no way to see that six reminders had already gone unanswered.
 *
 * The policy is rendered beside the queue rather than buried in settings,
 * because every number in the table is derived from it: "9 days late" means
 * nothing until you know the grace period it is counted from, and "no
 * escalation" means two opposite things depending on whether any thresholds
 * exist at all.
 */
export function OverdueView() {
  const access = usePermissionGate("timesheets:approvals:view");
  /**
   * `?userId=` is honoured by `TimesheetOverdueService.listOverdue` only when
   * `resolveApprovalScope` answers `all`; a narrower approver who picked a name
   * would get their own unchanged list back and no explanation, so the control
   * is not offered.
   */
  const canFilterByMember = useScope("timesheets:approvals:view") === "all";
  const shouldReduceMotion = useReducedMotion();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const memberFilter = searchParams.get("userId") ?? ALL;
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleMemberChange = useCallback(
    (value: string) =>
      replaceParams((params) => {
        if (value === ALL) params.delete("userId");
        else params.set("userId", value);
        /** A member filter changes the result set, so page 3 of it is meaningless. */
        params.delete("page");
      }),
    [replaceParams],
  );

  const handlePageChange = useCallback(
    (next: number) =>
      replaceParams((params) => {
        if (next <= 1) params.delete("page");
        else params.set("page", String(next));
      }),
    [replaceParams],
  );

  const { data, isLoading, isError, error, refetch } = useOverduePeriods({
    userId: canFilterByMember && memberFilter !== ALL ? memberFilter : undefined,
    page,
  });

  const memberOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (data?.items) {
      for (const item of data.items) {
        if (item.userId && !map.has(item.userId)) {
          map.set(item.userId, {
            id: item.userId,
            name: item.userName ?? item.userEmail ?? item.userId,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [data?.items]);

  const thresholds = useMemo(
    () => data?.escalationThresholds ?? [],
    [data?.escalationThresholds],
  );
  const columns = useMemo(() => buildOverdueColumns(thresholds), [thresholds]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  if (access.denied) {
    return (
      <PageWrapper title="Overdue timesheets">
        <EmptyState
          illustrationPreset="permissions"
          access={access}
          title="Access restricted"
          description="You don't have permission to view timesheet approvals."
        />
      </PageWrapper>
    );
  }

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const pageFilters = canFilterByMember ? (
    <Select value={memberFilter} onValueChange={handleMemberChange}>
      <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")} aria-label="Member">
        <SelectValue placeholder="All members" />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value={ALL}>All members</SelectItem>
        {memberOptions.map((emp) => (
          <SelectItem key={emp.id} value={emp.id}>
            {emp.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : undefined;

  const emptyState =
    memberFilter === ALL ? (
      <EmptyState
        illustrationPreset="alert"
        access={access}
        title="Nothing is overdue"
        description="Every timesheet period past its due date has been submitted."
        compact
      />
    ) : (
      <EmptyState
        illustrationPreset="alert"
        access={access}
        title="Nothing overdue for this member"
        description="They have submitted every period that is past its due date."
        action={{ label: "Show everyone", onClick: () => handleMemberChange(ALL) }}
        actionVariant="outline"
        compact
      />
    );

  return (
    <PageWrapper
      title="Overdue timesheets"
      subtitle="Periods past their due date, and how far each has escalated"
      filters={pageFilters}
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <motion.div {...motionProps} className="flex min-h-0 flex-1 flex-col space-y-4">
        {isLoading && !data ? (
          <StatCardGridSkeleton cols={3} count={3} />
        ) : (
          <StatCardGrid cols={3}>
            <StatCard label="Overdue periods" value={total} icon={Users} tone="red" />
            <StatCard
              label="Grace after period end"
              value={`${data?.graceDays ?? 0}d`}
              icon={CalendarClock}
              tone="amber"
              hint="A period is late once this many days have passed since it ended."
            />
            <StatCard
              label="Reminders sent at"
              value={
                thresholds.length > 0
                  ? thresholds.map((t) => `${t}d`).join(" · ")
                  : "Not configured"
              }
              icon={BellRing}
              tone={thresholds.length > 0 ? "blue" : "default"}
              hint={
                thresholds.length > 0
                  ? "Days past the due date at which the nightly sweep emails a reminder."
                  : "No reminder thresholds are set, so nobody is being emailed automatically."
              }
            />
          </StatCardGrid>
        )}

        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the overdue queue"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={rows}
            columns={columns}
            getRowKey={getOverdueRowKey}
            isLoading={isLoading}
            emptyState={emptyState}
            minWidth="900px"
            pagination={{
              mode: "server",
              page,
              pageSize: OVERDUE_PAGE_SIZE,
              total,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </motion.div>
    </PageWrapper>
  );
}
