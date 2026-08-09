"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  ScanLine,
} from "lucide-react";
import { CircleCheckIcon, XIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { useCan } from "@/hooks/api/access";
import {
  useDismissException,
  useExceptionsSummary,
  useResolveException,
  useRunExceptionDetection,
  useTimesheetExceptions,
} from "@/hooks/api/timesheets-core/exceptions";
import {
  EXCEPTION_RULE_LABEL,
  EXCEPTION_SEVERITY_BADGE,
  EXCEPTION_SEVERITY_LABEL,
  EXCEPTION_STATUS_BADGE,
  EXCEPTION_STATUS_LABEL,
  type ExceptionRule,
  type ExceptionSeverity,
  type ExceptionStatus,
  type TimesheetException,
} from "@/features/timesheets/types";
import { cn } from "@/lib/utils";
import {
  ExceptionReasonDialog,
  type ExceptionAction,
} from "./exception-reason-dialog";

const ALL_RULES = Object.keys(EXCEPTION_RULE_LABEL) as ExceptionRule[];

function isExceptionStatus(value: string): value is ExceptionStatus {
  return value in EXCEPTION_STATUS_LABEL;
}

function isExceptionSeverity(value: string): value is ExceptionSeverity {
  return value in EXCEPTION_SEVERITY_LABEL;
}

function isExceptionRule(value: string): value is ExceptionRule {
  return value in EXCEPTION_RULE_LABEL;
}

interface DialogState {
  action: ExceptionAction;
  exception: TimesheetException;
}

export function ExceptionsView() {
  const canView = useCan("timesheets:exceptions:view");
  const canManage = useCan("timesheets:exceptions:manage");
  const shouldReduceMotion = useReducedMotion();

  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const statusParam = isExceptionStatus(statusFilter) ? statusFilter : undefined;
  const severityParam = isExceptionSeverity(severityFilter)
    ? severityFilter
    : undefined;
  const ruleParam = isExceptionRule(ruleFilter) ? ruleFilter : undefined;

  const {
    data: exceptions,
    isLoading,
    isError,
    refetch,
  } = useTimesheetExceptions(
    {
      status: statusParam,
      severity: severityParam,
      rule: ruleParam,
      limit: 100,
    },
    canView,
  );

  const { data: summary, isLoading: isSummaryLoading } =
    useExceptionsSummary(canView);

  const resolveMutation = useResolveException();
  const dismissMutation = useDismissException();
  const runDetectionMutation = useRunExceptionDetection();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  const columns = useMemo<DataTableColumn<TimesheetException>[]>(
    () => [
      {
        key: "severity",
        header: "Severity",
        cell: (row) => (
          <Badge
            className={cn(
              "text-[10px] border px-1.5 py-0",
              EXCEPTION_SEVERITY_BADGE[row.severity],
            )}
          >
            {EXCEPTION_SEVERITY_LABEL[row.severity]}
          </Badge>
        ),
        sortable: true,
        sortValue: (row) => row.severity,
      },
      {
        key: "rule",
        header: "Rule",
        cell: (row) => (
          <span className="text-[11px] font-medium">
            {EXCEPTION_RULE_LABEL[row.rule]}
          </span>
        ),
        sortable: true,
        sortValue: (row) => EXCEPTION_RULE_LABEL[row.rule],
      },
      {
        key: "message",
        header: "Message",
        className: "max-w-[280px]",
        cell: (row) => (
          <span
            className="block truncate text-[11px] text-muted-foreground"
            title={row.message}
          >
            {row.message}
          </span>
        ),
      },
      {
        key: "worker",
        header: "Member",
        cell: (row) => (
          <div>
            <p className="text-[11px] font-medium">
              {row.user?.name ?? row.user?.email ?? "Unknown user"}
            </p>
            {row.user?.name && row.user?.email && (
              <p className="text-[10px] text-muted-foreground">
                {row.user.email}
              </p>
            )}
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.user?.name ?? row.user?.email ?? "",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            className={cn(
              "text-[10px] border px-1.5 py-0",
              EXCEPTION_STATUS_BADGE[row.status],
            )}
          >
            {EXCEPTION_STATUS_LABEL[row.status]}
          </Badge>
        ),
      },
      {
        key: "dueDate",
        header: "Due",
        cell: (row) =>
          row.dueDate ? (
            <span className="text-[11px] tabular-nums">
              {format(parseISO(row.dueDate), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          ),
        sortable: true,
        sortValue: (row) => row.dueDate ?? "",
      },
      {
        key: "createdAt",
        header: "Detected",
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground">
            {format(parseISO(row.createdAt), "MMM d, yyyy")}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.createdAt,
      },
      ...(canManage
        ? [
            {
              key: "actions",
              header: "",
              className: "w-16",
              cell: (row: TimesheetException) =>
                row.status === "OPEN" ? (
                  <div className="flex items-center gap-0.5">
                    <AnimatedIconButton
                      icon={CircleCheckIcon}
                      iconSize={12}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-emerald-600 hover:text-emerald-600 dark:text-emerald-400"
                      title="Resolve"
                      onClick={() => handleResolveRequest(row)}
                    />
                    <AnimatedIconButton
                      icon={XIcon}
                      iconSize={12}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      title="Dismiss"
                      onClick={() => handleDismissRequest(row)}
                    />
                  </div>
                ) : null,
            },
          ]
        : []),
    ],
    [canManage, handleResolveRequest, handleDismissRequest],
  );

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  if (!canView) {
    return (
      <PageWrapper title="Exceptions">
        <EmptyState
          illustrationPreset="permissions"
          title="Access restricted"
          description="You don't have permission to view timesheet exceptions."
        />
      </PageWrapper>
    );
  }

  const openCount = summary?.byStatus.OPEN ?? 0;
  const errorCount = summary?.openBySeverity.ERROR ?? 0;
  const warningCount = summary?.openBySeverity.WARNING ?? 0;
  const resolvedCount = summary?.byStatus.RESOLVED ?? 0;

  const pageFilters = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-32")}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(EXCEPTION_STATUS_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severityFilter} onValueChange={setSeverityFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-32")}>
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All severities</SelectItem>
          {Object.entries(EXCEPTION_SEVERITY_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={ruleFilter} onValueChange={setRuleFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-40")}>
          <SelectValue placeholder="Rule" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All rules</SelectItem>
          {ALL_RULES.map((rule) => (
            <SelectItem key={rule} value={rule}>
              {EXCEPTION_RULE_LABEL[rule]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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

  const emptyState =
    statusFilter === "OPEN" && severityFilter === "all" && ruleFilter === "all" ? (
      <EmptyState
        illustrationPreset="alert"
        title="No open exceptions"
        description="Great data hygiene — nothing needs your attention right now."
        compact
      />
    ) : (
      <EmptyState
        illustrationPreset="alert"
        title="No exceptions found"
        description="No exceptions match the current filters."
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
            description="Something went wrong loading the exceptions queue."
            onRetry={handleRetry}
            className="min-h-[30dvh]"
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={exceptions ?? []}
            columns={columns}
            getRowKey={getExceptionRowKey}
            isLoading={isLoading}
            pagination={{ pageSize: 25 }}
            minWidth="800px"
            emptyState={emptyState}
          />
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

function getExceptionRowKey(row: TimesheetException) {
  return row.id;
}
