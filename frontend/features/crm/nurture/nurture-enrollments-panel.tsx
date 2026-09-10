"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
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
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  NURTURE_ENROLLMENT_LAYOUT,
  nurtureEnrollmentRecordFields,
} from "@/lib/renderer/crm/nurture-layout";
import {
  useNurtureEnrollments,
  useUnenrolFromNurtureSequence,
} from "@/hooks/api/crm/nurture";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  NURTURE_ENROLLMENT_STATUSES,
  NURTURE_ENROLLMENT_STATUS_LABELS,
  type NurtureEnrollment,
  type NurtureEnrollmentStatus,
  type NurtureSequenceStatus,
} from "@/types/crm/nurture";
import { EnrolInNurtureDialog } from "./enrol-in-nurture-dialog";

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
 *
 * No table is written here. The columns, the status tone, the alignment of the
 * step count and the three ways a missing name is answered all come from
 * `NURTURE_ENROLLMENT_LAYOUT`. What is left is the status filter, the cursor
 * behind "show earlier", and the one control that changes an enrolment: stopping
 * it.
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

  const layout = useTenantLayout(NURTURE_ENROLLMENT_LAYOUT);

  const enrollments = useNurtureEnrollments(
    nurtureSequenceId,
    status ? { status } : {},
  );
  const unenrol = useUnenrolFromNurtureSequence();

  const enrolled = useMemo(
    () => (enrollments.data?.pages ?? []).flatMap((page) => page.data),
    [enrollments.data?.pages],
  );
  const rows = useMemo(
    () =>
      asRecordValues(
        enrolled.map((enrollment) => nurtureEnrollmentRecordFields(enrollment, stepCount)),
      ),
    [enrolled, stepCount],
  );

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

  /**
   * Stopping is the only thing anybody does to an enrolment, which is why it is
   * a row control rather than a field: it is offered on a running enrolment, to
   * somebody who may manage the cadence, and on nothing else.
   */
  const rowActions = useCallback(
    (row: RecordValue) => {
      const enrollment = enrolled.find(
        (candidate) => candidate.nurtureEnrollmentId === row.nurtureEnrollmentId,
      );
      if (!enrollment || enrollment.status !== "active") return null;
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => setStopping(enrollment)}
        >
          Stop
        </Button>
      );
    },
    [enrolled],
  );

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
        loading={
          <DataTableSkeleton
            rows={6}
            columns={layout.list.columns.length}
            className="flex-1 min-h-0"
          />
        }
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
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.nurtureEnrollmentId)}
          actions={canManage ? rowActions : undefined}
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
