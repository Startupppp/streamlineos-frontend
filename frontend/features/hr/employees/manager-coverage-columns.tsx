"use client";

import Link from "next/link";
import type { ReactNode, SyntheticEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { ReportingRelationshipBadge } from "@/components/hr/reporting-lines/reporting-relationship-badge";
import { useConfirmReportingFallback, useSetReportingLine } from "@/hooks/api/hr/reporting-lines";
import type { ManagerCoverageReport, ManagerState } from "@/hooks/api/hr/reporting-lines-schema";
import { getApiErrorCode } from "@/lib/api-envelope";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CircularChainRow } from "@/features/hr/employees/manager-coverage-names";

type Report = ManagerCoverageReport;
export type WithoutManagerRow = Report["withoutManager"][number];
export type InactiveManagerRow = Report["inactiveManager"][number];
export type OverSpanRow = Report["overSpan"][number];
export type FallbackRow = NonNullable<Report["fallback"]>[number];
export type PendingReviewRow = NonNullable<Report["pendingReview"]>[number];

const MANAGER_STATE_LABEL: Record<ManagerState, string> = {
  active: "Active",
  "on-notice": "On notice",
  inactive: "Inactive",
  exited: "Exited",
};

export function personLink(userId: string | null, name: string | null, fallback: string) {
  const label = name ?? fallback;
  if (!userId) return <span className="truncate">{label}</span>;
  return (
    <Link href={`/hr/employees/${userId}`} className="truncate text-primary hover:underline">
      {label}
    </Link>
  );
}

// Rows open the employee; a control inside a row must not. React events bubble
// through a popover's portal, so they are stopped at the cell boundary.
function stopRowActivation(event: SyntheticEvent) {
  event.stopPropagation();
}

/**
 * Assigns through the canonical reporting-line PUT (HRM-15), never the profile
 * PATCH. A change past the repeated-change threshold needs a reason this cell
 * cannot collect, so that refusal points HR at the profile's editor.
 */
export function AssignManagerCell({ userId, currentManagerUserId }: { userId: string | null; currentManagerUserId?: string | null }) {
  const setLine = useSetReportingLine();
  if (!userId) return <span className="text-xs text-muted-foreground">No user account</span>;

  function handleChange(managerUserId: string | null) {
    if (!userId || !managerUserId) return;
    setLine.mutate(
      { employeeUserId: userId, primaryManagerUserId: managerUserId },
      {
        onSuccess: () => toast.success("Manager assigned"),
        onError: (error) => {
          if (getApiErrorCode(error) === "CHANGE_REASON_REQUIRED")
            toast.error("This employee's manager changed several times today. Open their profile to give a reason.");
          else toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <span onClick={stopRowActivation} onKeyDown={stopRowActivation}>
    <ManagerCandidatePicker
      value={currentManagerUserId ?? null}
      onChange={handleChange}
      placeholder="Assign manager"
      excludeUserId={userId}
      disabled={setLine.isPending}
      className="w-56"
    />
    </span>
  );
}

function KeepFallbackButton({ userId }: { userId: string }) {
  const confirm = useConfirmReportingFallback();
  function handleKeep() {
    confirm.mutate(userId, {
      onSuccess: () => toast.success("Manager confirmed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }
  return (
    <LoadingButton type="button" size="sm" variant="ghost" isPending={confirm.isPending} onClick={handleKeep}>
      Keep
    </LoadingButton>
  );
}

export const WITHOUT_MANAGER_COLUMNS: DataTableColumn<WithoutManagerRow>[] = [
  { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, row.employeeNumber) },
  { key: "designation", header: "Designation", cell: (row) => <span className="truncate">{row.designation ?? "—"}</span> },
  { key: "status", header: "Employment", cell: (row) => <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">{row.lifecycleStatus}</Badge> },
  { key: "employeeNumber", header: "Employee no.", cell: (row) => <span className="font-mono text-dense">{row.employeeNumber}</span> },
];

export const WITHOUT_MANAGER_ASSIGN_COLUMN: DataTableColumn<WithoutManagerRow> = {
  key: "assign",
  header: "Manager",
  cell: (row) => <AssignManagerCell userId={row.userId} />,
};

export const INACTIVE_MANAGER_COLUMNS: DataTableColumn<InactiveManagerRow>[] = [
  { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, "Unnamed employee") },
  { key: "manager", header: "Reports to", cell: (row) => personLink(row.managerUserId, row.managerName, "Unnamed manager") },
  { key: "state", header: "Manager state", cell: (row) => <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">{MANAGER_STATE_LABEL[row.managerState]}</Badge> },
  { key: "since", header: "Since", cell: (row) => <span className="font-mono text-dense">{formatShortDate(row.effectiveFrom)}</span> },
];

export const INACTIVE_MANAGER_ASSIGN_COLUMN: DataTableColumn<InactiveManagerRow> = {
  key: "assign",
  header: "Change manager",
  cell: (row) => <AssignManagerCell userId={row.userId} currentManagerUserId={row.managerUserId} />,
};

export const CIRCULAR_COLUMNS: DataTableColumn<CircularChainRow>[] = [
  {
    key: "chain",
    header: "Reporting loop",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        {row.members.map((member, index) => (
          <span key={member.userId} className="flex items-center gap-1">
            {index > 0 ? <span className="text-muted-foreground" aria-hidden="true">→</span> : null}
            {personLink(member.userId, member.name, "Unnamed employee")}
          </span>
        ))}
      </div>
    ),
  },
];

export const OVER_SPAN_COLUMNS: DataTableColumn<OverSpanRow>[] = [
  { key: "manager", header: "Manager", cell: (row) => personLink(row.managerUserId, row.managerName, "Unnamed manager") },
  { key: "reports", header: "Direct reports", cell: (row) => <span className="font-mono tabular-nums">{row.directReports}</span> },
];

export const FALLBACK_COLUMNS: DataTableColumn<FallbackRow>[] = [
  { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, "Unnamed employee") },
  {
    key: "manager",
    header: "Temporary manager",
    cell: (row) => (
      <span className="flex flex-wrap items-center gap-1.5">
        {personLink(row.managerUserId, row.managerName, "Unnamed manager")}
        <ReportingRelationshipBadge kind="fallback" />
      </span>
    ),
  },
  { key: "since", header: "Since", cell: (row) => <span className="font-mono text-dense">{formatShortDate(row.effectiveFrom)}</span> },
];

/** Replace = assign the right manager; Keep = confirm the fallback as intended. */
export const FALLBACK_ACTION_COLUMN: DataTableColumn<FallbackRow> = {
  key: "actions",
  header: "Resolve",
  cell: (row) =>
    row.userId ? (
      <span className="flex flex-wrap items-center gap-2" onClick={stopRowActivation} onKeyDown={stopRowActivation}>
        <AssignManagerCell userId={row.userId} currentManagerUserId={row.managerUserId} />
        <KeepFallbackButton userId={row.userId} />
      </span>
    ) : null,
};

export function pendingReviewColumns(canReview: boolean): DataTableColumn<PendingReviewRow>[] {
  return [
    { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, "Unnamed employee") },
    { key: "asked", header: "Asked", cell: (row) => <span className="font-mono text-dense">{formatShortDate(row.createdAt)}</span> },
    {
      key: "review",
      header: "Request",
      // Addendum 1 Q6: link only for reviewers; others would land on Access Denied.
      cell: (row) =>
        canReview ? (
          <Link href={`/hr/employees/reporting-requests?request=${row.requestId}`} className="text-primary hover:underline">
            Review
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Awaiting HR review</span>
        ),
    },
  ];
}

/**
 * Below `sm` the coverage tables render as stacked cards (DataTable `mobileCard`),
 * so the Assign / Keep / Review actions stay on screen at 375px.
 */
function MobileCard({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3">
      <div className="min-w-0 text-sm font-medium">{title}</div>
      {meta ? <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{meta}</div> : null}
      {children ? <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function withoutManagerCard(canEdit: boolean) {
  return function WithoutManagerCard(row: WithoutManagerRow) {
    return (
      <MobileCard title={personLink(row.userId, row.name, row.employeeNumber)} meta={<span>{row.designation ?? row.lifecycleStatus}</span>}>
        {canEdit ? <AssignManagerCell userId={row.userId} /> : null}
      </MobileCard>
    );
  };
}

export function fallbackCard(canEdit: boolean) {
  return function FallbackCard(row: FallbackRow) {
    return (
      <MobileCard
        title={personLink(row.userId, row.name, "Unnamed employee")}
        meta={
          <>
            {personLink(row.managerUserId, row.managerName, "Unnamed manager")}
            <ReportingRelationshipBadge kind="fallback" />
          </>
        }
      >
        {canEdit && row.userId ? (
          <>
            <AssignManagerCell userId={row.userId} currentManagerUserId={row.managerUserId} />
            <KeepFallbackButton userId={row.userId} />
          </>
        ) : null}
      </MobileCard>
    );
  };
}

export function inactiveManagerCard(canEdit: boolean) {
  return function InactiveManagerCard(row: InactiveManagerRow) {
    return (
      <MobileCard
        title={personLink(row.userId, row.name, "Unnamed employee")}
        meta={
          <>
            <span>Reports to</span>
            {personLink(row.managerUserId, row.managerName, "Unnamed manager")}
            <span>({MANAGER_STATE_LABEL[row.managerState]})</span>
          </>
        }
      >
        {canEdit ? <AssignManagerCell userId={row.userId} currentManagerUserId={row.managerUserId} /> : null}
      </MobileCard>
    );
  };
}

export function pendingReviewCard(canReview: boolean) {
  return function PendingReviewCard(row: PendingReviewRow) {
    return (
      <MobileCard
        title={personLink(row.userId, row.name, "Unnamed employee")}
        meta={<span>Asked <span className="font-mono">{formatShortDate(row.createdAt)}</span></span>}
      >
        {canReview ? (
          <Link href={`/hr/employees/reporting-requests?request=${row.requestId}`} className="text-sm text-primary hover:underline">
            Review
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Awaiting HR review</span>
        )}
      </MobileCard>
    );
  };
}
