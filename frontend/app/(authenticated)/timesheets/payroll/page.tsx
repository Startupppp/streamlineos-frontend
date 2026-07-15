"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import { Banknote, Settings2, Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useCan } from "@/hooks/api/access";
import {
  useTimesheetPayrollSummary,
  useTimesheetPayrollSettings,
} from "@/hooks/api/timesheets/payroll";
import {
  PayrollStats,
  PayrollFilters,
  PayrollExceptionsBanner,
  PayrollQueueTable,
  PayrollRowDetailSheet,
  PayrollExportDialog,
  PayrollMappingSheet,
  PayrollExportsHistory,
  PayrollPageSkeleton,
} from "@/features/timesheets/payroll";
import { getPresetRange } from "@/features/timesheets/payroll/lib/period-presets";
import type { PayrollSummaryRow } from "@/features/timesheets/payroll/types";
import { DEFAULT_PAYROLL_MAPPING } from "@/features/timesheets/payroll/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyReportIllustration } from "@/components/illustrations";

const MAX_RANGE_DAYS = 92;

export default function TimesheetPayrollPage() {
  const canExport = useCan("timesheets:payroll:export");
  const canView = useCan("timesheets:payroll:view");
  const shouldReduceMotion = useReducedMotion();

  const { data: settings, isLoading: settingsLoading } = useTimesheetPayrollSettings();

  const searchParams = useSearchParams();
  const defaultRange = useMemo(
    () => getPresetRange("this-period", settings?.payPeriod ?? "MONTHLY"),
    [settings?.payPeriod],
  );
  const start = searchParams.get("start") ?? defaultRange.from;
  const end = searchParams.get("end") ?? defaultRange.to;
  const userId = searchParams.get("userId") ?? undefined;
  const includeExported = searchParams.get("includeExported") === "true";

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<PayrollSummaryRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);

  const rangeState = useMemo(() => {
    if (!start || !end) return "incomplete" as const;
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (!isValid(startDate) || !isValid(endDate)) return "invalid" as const;
    const days = differenceInCalendarDays(endDate, startDate);
    if (days < 0) return "reversed" as const;
    if (days > MAX_RANGE_DAYS) return "too-long" as const;
    return "valid" as const;
  }, [start, end]);

  const queryEnabled = rangeState === "valid" && canView;

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useTimesheetPayrollSummary(
    { start, end, userId: userId === "all" ? undefined : userId, includeExported },
    queryEnabled,
  );

  const rows = useMemo(() => summary?.rows ?? [], [summary]);
  const totals = summary?.totals;
  const exceptions = summary?.exceptions;

  const visibleSelectedUserIds = useMemo(() => {
    if (selectedUserIds.size === 0) return selectedUserIds;
    const validIds = new Set(rows.map((r) => r.userId));
    const pruned = new Set([...selectedUserIds].filter((id) => validIds.has(id)));
    return pruned.size === selectedUserIds.size ? selectedUserIds : pruned;
  }, [rows, selectedUserIds]);

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedUserIds(new Set([...sel].map(String)));
  }, []);

  const handleRowClick = useCallback((row: PayrollSummaryRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailRow(null);
  }, []);

  const handleExportOpen = useCallback(() => setExportOpen(true), []);
  const handleMappingOpen = useCallback(() => setMappingOpen(true), []);

  const totalPayable = totals?.payableHours ?? 0;
  const canDoExport = totalPayable > 0 || visibleSelectedUserIds.size > 0;

  const subtitle =
    totals
      ? `${totals.userCount} people · ${totals.payableHours.toFixed(1)} h payable`
      : undefined;

  const hasFilters = !!(userId && userId !== "all");

  const mapping = settings?.payrollMapping ?? DEFAULT_PAYROLL_MAPPING;

  const handleSummaryRetry = useCallback(() => {
    void refetchSummary();
  }, [refetchSummary]);

  const pageActions = (
    <div className="flex items-center gap-2">
      {canExport && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleMappingOpen}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Mapping
        </Button>
      )}
      {canExport && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleExportOpen}
          disabled={!canDoExport || summaryLoading}
        >
          {summaryLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Banknote className="h-3.5 w-3.5" />
          )}
          Export
        </Button>
      )}
    </div>
  );

  const pageFilters = settings ? (
    <PayrollFilters payPeriod={settings.payPeriod} rows={rows} />
  ) : null;

  if (settingsLoading && summaryLoading) return <PayrollPageSkeleton />;

  if (!canView) {
    return (
      <PageWrapper title="Payroll">
        <EmptyState
          illustration={<EmptyReportIllustration className="h-32 w-32" />}
          title="Access restricted"
          description="You don't have permission to view payroll data."
        />
      </PageWrapper>
    );
  }

  const rangeError =
    rangeState === "invalid"
      ? "The selected dates are invalid."
      : rangeState === "reversed"
        ? "End date must be after start date."
        : rangeState === "too-long"
          ? "Date range cannot exceed 92 days."
          : null;

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  return (
    <PageWrapper
      title="Payroll"
      subtitle={subtitle}
      actions={pageActions}
    >
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col gap-4">
        {rangeError && (
          <p className="text-xs text-destructive px-1">{rangeError}</p>
        )}

        <PayrollStats totals={totals} isLoading={summaryLoading} />

        {exceptions && exceptions.pendingApprovals.length > 0 && (
          <PayrollExceptionsBanner
            pendingApprovalCount={totals?.pendingApprovalCount ?? 0}
            pendingApprovalHours={totals?.pendingApprovalHours ?? 0}
            pendingUserCount={totals?.pendingUserCount ?? 0}
          />
        )}

        <Tabs defaultValue="queue" className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList>
            <TabsTrigger value="queue">Pay Period</TabsTrigger>
            <TabsTrigger value="history">Export History</TabsTrigger>
          </TabsList>

          {pageFilters ? (
            <div className="flex flex-wrap items-center gap-3">
              {pageFilters}
            </div>
          ) : null}

          <TabsContent value="queue" className="mt-0">
            {summaryError ? (
              <ErrorState
                title="Couldn't load the payroll queue"
                description="Something went wrong while loading payable hours for this period."
                onRetry={handleSummaryRetry}
                className="flex-1 min-h-[40vh]"
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <PayrollQueueTable
                    rows={rows}
                    isLoading={summaryLoading}
                    hasFilters={hasFilters}
                    selection={visibleSelectedUserIds}
                    onSelectionChange={handleSelectionChange}
                    onRowClick={handleRowClick}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <PayrollExportsHistory fallbackMapping={mapping} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <PayrollRowDetailSheet
        row={detailRow}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />

      {exportOpen && (
        <PayrollExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          start={start}
          end={end}
          allRows={rows}
          selectedUserIds={visibleSelectedUserIds}
          mapping={mapping}
        />
      )}

      {mappingOpen && settings && (
        <PayrollMappingSheet
          open={mappingOpen}
          onOpenChange={setMappingOpen}
          settings={settings}
        />
      )}
    </PageWrapper>
  );
}
