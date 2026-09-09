"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, Gated } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  useNurtureEnrollments,
  useUnenrolFromNurtureSequence,
} from "@/hooks/api/crm/nurture";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  NURTURE_ENROLLMENT_STATUSES,
  NURTURE_ENROLLMENT_STATUS_LABELS,
  NURTURE_EXIT_REASON_LABELS,
  type NurtureEnrollment,
  type NurtureEnrollmentStatus,
  type NurtureSequenceStatus,
} from "@/types/crm/nurture";
import { EnrolInNurtureDialog } from "./enrol-in-nurture-dialog";
import { NurtureEnrollmentStatusBadge } from "./nurture-status-badge";

const ALL = "all";

interface NurtureEnrollmentsPanelProps {
  nurtureSequenceId: string;
  sequenceStatus: NurtureSequenceStatus;
  stepCount: number;
  canManage: boolean;
}

/**
 * Who is in the cadence, and everybody who has left it.
 *
 * Unfiltered by default, matching the server's own default: a sequence nobody
 * is enrolled in any more and one nobody was ever enrolled in look identical
 * from an active-only list, and the exit reasons are the whole point — `replied`
 * is the number this feature is judged on.
 */
export function NurtureEnrollmentsPanel({
  nurtureSequenceId,
  sequenceStatus,
  stepCount,
  canManage,
}: NurtureEnrollmentsPanelProps) {
  const [status, setStatus] = useState<NurtureEnrollmentStatus | undefined>(undefined);
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [stopping, setStopping] = useState<NurtureEnrollment | null>(null);

  const enrollments = useNurtureEnrollments(
    nurtureSequenceId,
    status ? { status } : {},
  );
  const unenrol = useUnenrolFromNurtureSequence();

  const rows = enrollments.data?.pages.flatMap((page) => page.data) ?? [];
  const canEnrol = canManage && sequenceStatus === "active" && stepCount > 0;

  const handleStatusChange = (value: string) =>
    setStatus(value === ALL ? undefined : (value as NurtureEnrollmentStatus));

  const handleStop = () => {
    if (!stopping) return;
    unenrol.mutate(
      {
        nurtureSequenceId,
        nurtureEnrollmentId: stopping.nurtureEnrollmentId,
      },
      {
        onSuccess: () => {
          toast.success("Taken out of the sequence");
          setStopping(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const columns: DataTableColumn<NurtureEnrollment>[] = [
    {
      key: "party",
      header: "Customer",
      /*
        The name comes with the row. It used to be looked up here — one directory
        page for the panel plus a per-row fallback — which made a list of twenty
        customers a fan-out of requests, and read "a customer you can't see" for
        anybody outside the first hundred even though the reader could see them
        perfectly well. `listEnrollments` resolves the whole page in one query
        instead, the way the decision feed next door always did.
      */
      cell: (row) =>
        row.partyName ? (
          <span className="truncate font-medium">{row.partyName}</span>
        ) : (
          /* Null means the party is gone, not that it is unreadable. */
          <span className="text-muted-foreground">A customer who has been removed</span>
        ),
    },
    {
      key: "deal",
      header: "Deal",
      cell: (row) =>
        row.dealId === null ? (
          <span className="text-muted-foreground">No deal</span>
        ) : (
          <span className="truncate">{row.dealName ?? "A deal that has been removed"}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <NurtureEnrollmentStatusBadge status={row.status} />,
    },
    {
      key: "progress",
      header: "Steps done",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => `${row.currentStep} / ${stepCount}`,
    },
    {
      key: "enrolledAt",
      header: "Enrolled",
      className: "tabular-nums",
      cell: (row) => formatShortDate(row.enrolledAt),
    },
    {
      key: "outcome",
      header: "Why it ended",
      cell: (row) =>
        row.exitReason ? (
          <span>
            {NURTURE_EXIT_REASON_LABELS[row.exitReason] ?? row.exitReason}
            {row.exitedAt ? (
              <span className="text-micro text-muted-foreground"> · {formatShortDate(row.exitedAt)}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: (row) =>
        canManage && row.status === "active" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setStopping(row)}
          >
            Stop
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap-field">
      <div className="flex flex-wrap items-center gap-gap-toolbar">
        <Select value={status ?? ALL} onValueChange={handleStatusChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Filter enrolments by status">
            <SelectValue placeholder="Everyone ever enrolled" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value={ALL}>Everyone ever enrolled</SelectItem>
            {NURTURE_ENROLLMENT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {NURTURE_ENROLLMENT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {!canEnrol ? (
              <p className="text-micro text-muted-foreground">
                {stepCount === 0
                  ? "Add a step before enrolling anybody."
                  : "Turn the sequence on before enrolling anybody."}
              </p>
            ) : null}
            <Button type="button" size="sm" disabled={!canEnrol} onClick={() => setEnrolOpen(true)}>
              Enrol a customer
            </Button>
          </div>
        ) : null}
      </div>

      {/*
        Denial before emptiness, and both before loading, because a disabled
        query reports `isLoading: false` — so a reviewer without the key would
        otherwise be told nobody is enrolled, which is a different and much
        worse statement than "you may not look".
      */}
      <Gated
        permission="crm:autonomy:view"
        isLoading={enrollments.isLoading}
        isError={enrollments.isError}
        isEmpty={rows.length === 0}
        className="flex-1"
        loading={<DataTableSkeleton rows={6} columns={columns.length} className="flex-1 min-h-0" />}
        error={
          <ErrorState
            className="flex-1"
            title="Couldn’t load who is enrolled"
            description={getErrorMessage(enrollments.error)}
            onRetry={() => void enrollments.refetch()}
          />
        }
        empty={
          <EmptyState
            className="flex-1 min-h-[40vh]"
            illustrationPreset="team"
            title={status ? "Nobody in that state" : "Nobody is enrolled"}
            description={
              status
                ? "No enrolment in this sequence is in that state."
                : "Enrolling somebody schedules autonomous messages against their deal. Nothing is scheduled until you do."
            }
          />
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.nurtureEnrollmentId}
          className="flex-1 min-h-0"
          minWidth="900px"
          pagination={{ pageSize: 25 }}
          footer={
            enrollments.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enrollments.isFetchingNextPage}
                onClick={() => void enrollments.fetchNextPage()}
              >
                Show earlier enrolments
              </Button>
            ) : undefined
          }
        />
      </Gated>

      <EnrolInNurtureDialog
        nurtureSequenceId={nurtureSequenceId}
        open={enrolOpen}
        onOpenChange={setEnrolOpen}
      />

      <ConfirmDialog
        open={stopping !== null}
        onOpenChange={(next) => setStopping(next ? stopping : null)}
        title="Take them out of this sequence?"
        description="Nothing further is scheduled for them and the enrolment is recorded as stopped by hand. Re-enrolling later starts the cadence from step one."
        confirmLabel="Stop the cadence"
        destructive
        isPending={unenrol.isPending}
        keepOpenOnConfirm
        onConfirm={handleStop}
      />
    </div>
  );
}
