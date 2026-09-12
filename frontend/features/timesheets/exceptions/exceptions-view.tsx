"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  ScanLine,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { usePermissionGate, useCan, useScope } from "@/hooks/api/access";
import {
  useDismissException,
  useExceptionsSummary,
  useResolveException,
  useRunExceptionDetection,
  useTimesheetExceptions,
} from "@/hooks/api/timesheets-core/exceptions";
import {
  EXCEPTION_RULE_LABEL,
  EXCEPTION_SEVERITY_LABEL,
  EXCEPTION_STATUS_LABEL,
  type ExceptionRule,
  type TimesheetException,
} from "@/features/timesheets/exception-types";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  ExceptionReasonDialog,
  type ExceptionAction,
} from "./exception-reason-dialog";
import { buildExceptionColumns } from "./exception-columns";
import { ALL, useExceptionFilters } from "./use-exception-filters";

const ALL_RULES = Object.keys(EXCEPTION_RULE_LABEL) as ExceptionRule[];

interface DialogState {
  action: ExceptionAction;
  exception: TimesheetException;
}

function getExceptionRowKey(row: TimesheetException) {
  return row.id;
}

export function ExceptionsView() {
  const access = usePermissionGate("timesheets:exceptions:view");
  const canManage = useCan("timesheets:exceptions:manage");
  /**
   * The backend honours `?userId=` only when the caller's
   * `timesheets:team:view` scope is `all` (`ExceptionsService.listExceptions`),
   * so anyone narrower is offered a control that would silently do nothing.
   */
  const canFilterByMember = useScope("timesheets:team:view") === "all";
  const shouldReduceMotion = useReducedMotion();

  const filters = useExceptionFilters();
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const {
    data: exceptions,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTimesheetExceptions({
    status: filters.statusParam,
    severity: filters.severityParam,
    rule: filters.ruleParam,
    userId: canFilterByMember ? filters.userIdParam : undefined,
  });

  const { data: summary, isLoading: isSummaryLoading } = useExceptionsSummary();

  const memberOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (exceptions) {
      for (const page of exceptions.pages) {
        for (const item of page.data) {
          const u = item.user;
          if (u?.membershipId) {
            const id = String(u.membershipId);
            const name = u.name ?? u.email ?? id;
            if (!map.has(id)) map.set(id, { id, name });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [exceptions]);

  const resolveMutation = useResolveException();
  const dismissMutation = useDismissException();
  const runDetectionMutation = useRunExceptionDetection();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRunDetection = useCallback(() => {
    runDetectionMutation.mutate();
  }, [runDetectionMutation]);

  const handleResolveRequest = useCallback((exception: TimesheetException) => {
    setDialogState({ action: "resolve", exception });
  }, []);

  const handleDismissRequest = useCallback((exception: TimesheetException) => {
    setDialogState({ action: "dismiss", exception });
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDialogState(null);
  }, []);

  const handleDialogConfirm = useCallback(
    (reason: string) => {
      if (!dialogState) return;
      const mutation =
        dialogState.action === "resolve" ? resolveMutation : dismissMutation;
      mutation.mutate(
        { exceptionId: dialogState.exception.id, reason },
        { onSuccess: () => setDialogState(null) },
      );
    },
    [dialogState, resolveMutation, dismissMutation],
  );

  const columns = useMemo(
    () =>
      buildExceptionColumns({
        canManage,
        showResolution: filters.status !== "OPEN",
        onResolve: handleResolveRequest,
        onDismiss: handleDismissRequest,
      }),
    [canManage, filters.status, handleResolveRequest, handleDismissRequest],
  );

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  if (access.denied) {
    return (
      <PageWrapper title="Exceptions">
        <EmptyState
          illustrationPreset="permissions"
          access={access}
          title="Access restricted"
          description="You don't have permission to view timesheet exceptions."
        />
      </PageWrapper>
    );
  }

  const rows = exceptions?.pages.flatMap((p) => p.data) ?? [];
  const openCount = summary?.byStatus.OPEN ?? 0;
  const errorCount = summary?.openBySeverity.ERROR ?? 0;
  const warningCount = summary?.openBySeverity.WARNING ?? 0;
  const resolvedCount = summary?.byStatus.RESOLVED ?? 0;

  const pageFilters = (
    <>
      <Select value={filters.status} onValueChange={filters.setStatus}>
        <SelectTrigger
          className={cn(FILTER_SELECT_TRIGGER, "w-32")}
          aria-label="Status"
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Object.entries(EXCEPTION_STATUS_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.severity} onValueChange={filters.setSeverity}>
        <SelectTrigger
          className={cn(FILTER_SELECT_TRIGGER, "w-32")}
          aria-label="Severity"
        >
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value={ALL}>All severities</SelectItem>
          {Object.entries(EXCEPTION_SEVERITY_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.rule} onValueChange={filters.setRule}>
        <SelectTrigger
          className={cn(FILTER_SELECT_TRIGGER, "w-40")}
          aria-label="Rule"
        >
          <SelectValue placeholder="Rule" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value={ALL}>All rules</SelectItem>
          {ALL_RULES.map((rule) => (
            <SelectItem key={rule} value={rule}>
              {EXCEPTION_RULE_LABEL[rule]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canFilterByMember && (
        <Select value={filters.userId} onValueChange={filters.setUserId}>
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "w-44")}
            aria-label="Member"
          >
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
      )}
    </>
  );

  const pageActions = canManage ? (
    <LoadingButton
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleRunDetection}
      isPending={runDetectionMutation.isPending}
      loadingText="Running…"
    >
      <ScanLine className="h-3.5 w-3.5" />
      Run detection
    </LoadingButton>
  ) : undefined;

  const emptyState = (
    <EmptyState
      illustrationPreset="alert"
      access={access}
      title="No open exceptions"
      description={
        filters.isDefault
          ? "Great data hygiene — nothing needs your attention right now."
          : undefined
      }
      filtersActive={!filters.isDefault}
      onClearFilters={filters.clear}
      compact
    />
  );

  const isDialogPending =
    dialogState?.action === "resolve"
      ? resolveMutation.isPending
      : dismissMutation.isPending;

  return (
    <PageWrapper
      title="Exceptions"
      subtitle="Data quality issues flagged across your team's timesheets"
      filters={pageFilters}
      actions={pageActions}
    >
      <motion.div
        {...motionProps}
        className="flex flex-1 min-h-0 flex-col space-y-4"
      >
        {isSummaryLoading ? (
          <StatCardGridSkeleton cols={4} count={4} />
        ) : (
          <StatCardGrid cols={4}>
            <StatCard
              label="Open"
              value={openCount}
              icon={Inbox}
              tone="accent"
            />
            <StatCard
              label="Errors"
              value={errorCount}
              icon={AlertCircle}
              tone="red"
            />
            <StatCard
              label="Warnings"
              value={warningCount}
              icon={AlertTriangle}
              tone="amber"
            />
            <StatCard
              label="Resolved"
              value={resolvedCount}
              icon={CheckCircle2}
              tone="emerald"
            />
          </StatCardGrid>
        )}

        {isError ? (
          <ErrorState
            title="Couldn't load exceptions"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className="min-h-[30dvh]"
          />
        ) : (
          <>
            <DataTable
              className="flex-1 min-h-0"
              data={rows}
              columns={columns}
              getRowKey={getExceptionRowKey}
              isLoading={isLoading}
              pagination={{ pageSize: 25 }}
              minWidth="800px"
              emptyState={emptyState}
            />
            {hasNextPage && (
              <div className="flex justify-center pb-2">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  isPending={isFetchingNextPage}
                  onClick={handleLoadMore}
                >
                  Load more
                </LoadingButton>
              </div>
            )}
          </>
        )}
      </motion.div>

      <ExceptionReasonDialog
        open={dialogState !== null}
        action={dialogState?.action ?? "resolve"}
        exception={dialogState?.exception ?? null}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleDialogConfirm}
        isPending={isDialogPending}
      />
    </PageWrapper>
  );
}
