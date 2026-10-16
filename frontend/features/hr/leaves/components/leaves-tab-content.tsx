"use client";

import { memo, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";

const LeaveBalanceDonut = dynamic(
  () => import("./leave-balance-donut").then((m) => ({ default: m.LeaveBalanceDonut })),
  { ssr: false, loading: () => <Skeleton className="h-[190px] w-full rounded-2xl" /> },
);

import type { LeaveBalance, LeaveRequest, ApprovedLeave } from "./leaves-shared";
import { BalanceCard, balanceCardConfig, DEFAULT_CARD_CONFIG, priorityConfig } from "./leaves-shared";
import { LeaveCalendarWidget } from "./leave-calendar-widget";
import { RequestActionCell } from "./leave-request-action-cell";
import { useCancelLeave } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/i18n";

import { getErrorMessage } from "@/lib/get-error-message";
import { useLeavePolicy } from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getUserDisplayName } from "@/lib/person-display";

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
  compact?: boolean;
  onRequestLeave?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function LeavesTabContent({
  balances,
  myLeaveRequests,
  approvedLeavesThisWeek = [],
  compact = false,
  onRequestLeave,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: LeavesTabContentProps) {
  const t = useT();
  const { data: policy } = useLeavePolicy();
  const allowedLeaveTypeNames = useMemo(
    () => new Set(policy?.leaveTypes.map((t) => t.name) ?? []),
    [policy],
  );

  const currentYear = new Date().getFullYear();

  const cancelMutation = useCancelLeave();

  const handleCancelRequest = useCallback(
    (id: number) => {
      cancelMutation.mutate(id, {
        onSuccess: () => toast.success("Leave request cancelled"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [cancelMutation],
  );

  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(
    () => [
      {
        key: "type",
        header: "Type",
        cell: (row) => {
          const typeName = row.leaveType?.name ?? "Leave";
          const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-7 items-center justify-center rounded-lg",
                  config.iconBg,
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", config.iconColor)}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <TruncatedText
                  text={typeName.replace(" Leave", "")}
                  className="text-sm font-semibold leading-tight text-foreground"
                />
                <p className="text-micro text-muted-foreground">Leave</p>
              </div>
            </div>
          );
        },
      },
      {
        key: "dateRequested",
        header: "Date Requested",
        cell: (row) => {
          const createdAt = row.createdAt
            ? new Date(row.createdAt)
            : new Date(row.startDate);
          return (
            <span className="text-xs tabular-nums text-muted-foreground">
              {format(createdAt, "MMM d, yyyy")}
            </span>
          );
        },
        className: "hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
      },
      {
        key: "period",
        header: "Period",
        cell: (row) => {
          const start = new Date(row.startDate);
          const end = new Date(row.endDate);
          const days = differenceInCalendarDays(end, start) + 1;
          const periodStr =
            days === 1
              ? format(start, "MMM d")
              : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
          return (
            <span className="text-xs font-medium text-foreground">{periodStr}</span>
          );
        },
      },
      {
        key: "days",
        header: "Days",
        cell: (row) => {
          const start = new Date(row.startDate);
          const end = new Date(row.endDate);
          const days = differenceInCalendarDays(end, start) + 1;
          return (
            <span className="text-center text-xs font-semibold tabular-nums text-foreground">
              {days}
            </span>
          );
        },
      },
      {
        key: "priority",
        header: "Priority",
        cell: (row) => {
          const priority = row.priority ?? "MEDIUM";
          const pConfig =
            priorityConfig[priority] ??
            priorityConfig["MEDIUM"] ?? {
              label: "Medium",
              dotColor: "bg-status-warning-fill",
              textColor: "text-status-warning-ink",
            };
          return (
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", pConfig.dotColor)} />
              <span className={cn("text-micro font-semibold", pConfig.textColor)}>
                {pConfig.label}
              </span>
            </div>
          );
        },
        className: "hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => {
          const status = row.status ?? "PENDING";
          const statusBadgeClass =
            status === "PENDING"
              ? "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
              : status === "APPROVED"
                ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                : status === "CANCELLED"
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-micro font-semibold",
                  statusBadgeClass,
                )}
              >
                {/* V-046. A decided row said only "Approved"/"Rejected" while
                    `my()` already hydrates the approver — the one thing the
                    reader wants to know. */}
                {decidedByLabel(status, row.approver)}
              </span>
              {row.managerComment && (
                <TruncatedText
                  text={`"${row.managerComment}"`}
                  className="max-w-[120px] text-micro text-muted-foreground"
                />
              )}
              {status === "REJECTED" && row.rejectionReason && (
                <span
                  className="max-w-[120px] truncate text-micro text-status-danger-ink"
                  title={row.rejectionReason}
                >
                  {row.rejectionReason}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "action",
        header: "Action",
        cell: (row) => (
          <div className="flex justify-end">
            <RequestActionCell
              request={row}
              isCancelling={cancelMutation.isPending && cancelMutation.variables === row.id}
              onCancel={handleCancelRequest}
            />
          </div>
        ),
        headerClassName: "text-right",
      },
    ],
    [cancelMutation.isPending, cancelMutation.variables, handleCancelRequest],
  );

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 w-full flex-1 flex-col"
          : "w-full space-y-4"
      }
    >
      {!compact && (
        <>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">Overview</h2>
            <p className="text-xs text-muted-foreground">
              Your leave balances and history for {currentYear}.
            </p>
          </div>

          <ul
            className="grid grid-cols-2 gap-3 lg:grid-cols-3"
            aria-label="Leave balances"
          >
            {balances
              .filter(
                // useLeavePolicy needs hr:leaves:view; a self-service caller
                // without it gets no policy and must still see their balances.
                (bal) => bal.typeName && (!policy || allowedLeaveTypeNames.has(bal.typeName)),
              )
              .map((bal, index) => (
                <li key={`${bal.leaveTypeId}-${index}`}>
                  <BalanceCard
                    typeName={bal.typeName}
                    balance={bal.balance}
                    daysPerYear={bal.daysPerYear}
                  />
                </li>
              ))}
          </ul>

          <div className="grid gap-4 md:grid-cols-2">
            <LeaveBalanceDonut balances={balances} allowedNames={allowedLeaveTypeNames} />
            <LeaveCalendarWidget approvedLeaves={approvedLeavesThisWeek} />
          </div>
        </>
      )}

      {myLeaveRequests.length === 0 ? (
        <EmptyState
          illustrationPreset="calendar"
          title={t("timeOff.noRequestsTitle")}
          description={t("timeOff.noRequestsDescription")}
          action={
            onRequestLeave
              ? { label: t("timeOff.requestLeave"), onClick: onRequestLeave }
              : undefined
          }
          className={PAGE_BODY_EMPTY_CLASS}
        />
      ) : (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col" aria-live="polite">
          <ul
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:hidden"
            aria-label="My leave requests"
          >
            {myLeaveRequests.map((row) => (
              <li key={row.id}>
                <LeaveRequestMobileItem
                  row={row}
                  isCancelling={cancelMutation.isPending && cancelMutation.variables === row.id}
                  onCancel={handleCancelRequest}
                />
              </li>
            ))}
          </ul>
          <div className="hidden min-h-0 w-full flex-1 flex-col md:flex">
            <DataTable
              data={myLeaveRequests}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="600px"
              className="min-h-0 w-full flex-1"
            />
          </div>
          {onLoadMore ? (
            <InfiniteScrollSentinel
              hasNextPage={hasMore}
              isFetchingNextPage={isLoadingMore}
              onLoadMore={onLoadMore}
              label="Load older requests"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

interface LeaveRequestMobileItemProps {
  row: LeaveRequest;
  isCancelling: boolean;
  onCancel: (id: number) => void;
}

const LeaveRequestMobileItem = memo(function LeaveRequestMobileItem({
  row,
  isCancelling,
  onCancel,
}: LeaveRequestMobileItemProps) {
  const typeName = row.leaveType?.name ?? "Leave";
  const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
  const Icon = config.icon;
  const start = new Date(row.startDate);
  const end = new Date(row.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  const periodStr =
    days === 1
      ? format(start, "MMM d")
      : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  const status = row.status ?? "PENDING";
  const statusBadgeClass =
    status === "PENDING"
      ? "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
      : status === "APPROVED"
        ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
        : status === "CANCELLED"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex h-8 w-7 shrink-0 items-center justify-center rounded-lg",
            config.iconBg,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", config.iconColor)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <TruncatedText
            text={typeName.replace(" Leave", "")}
            className="text-sm font-semibold leading-tight text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {periodStr} · <span className="tabular-nums">{days}d</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-micro font-semibold",
            statusBadgeClass,
          )}
        >
          {decidedByLabel(status, row.approver)}
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <RequestActionCell request={row} isCancelling={isCancelling} onCancel={onCancel} />
      </div>
    </div>
  );
});

export function decidedByLabel(
  status: string,
  approver: { name?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined,
): string {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  if (status !== "APPROVED" && status !== "REJECTED") return label;
  const name = approver ? getUserDisplayName(approver) : null;
  return name && name !== "Unassigned" && name !== "Unknown"
    ? `${label} by ${name}`
    : label;
}
