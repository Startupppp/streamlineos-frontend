"use client";

import { useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatTimeInOrgTz } from "@/lib/date-utils";
import { formatIstDate } from "@/lib/hrms/payroll-cutoff";
import type { AttendanceRegularization } from "@/hooks/api/hr/attendance";
import { NeedsAnotherApprover, SelfApprovalBadge } from "@/features/hr/shared/self-approval";

const STATUS_TONE: Readonly<Record<string, StatusTone>> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const STATUS_LABEL: Readonly<Record<string, string>> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function RegularizationStatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toUpperCase();
  const tone = statusToneClasses(STATUS_TONE[key] ?? "neutral");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${tone.surface} ${tone.rule} ${tone.ink}`}
    >
      {STATUS_LABEL[key] ?? (key || "Unknown")}
    </span>
  );
}

function punchShift(original: string | null | undefined, requested: string | null | undefined): string | null {
  if (!original || !requested) return null;
  const minutes = Math.round((Date.parse(requested) - Date.parse(original)) / 60_000);
  if (!Number.isFinite(minutes) || minutes === 0) return null;
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const body = hours > 0 ? `${hours} h${abs % 60 ? ` ${abs % 60} min` : ""}` : `${abs} min`;
  return `${minutes > 0 ? "+" : "−"}${body}`;
}

interface RegularizationRowProps {
  row: AttendanceRegularization;
  canDecide: boolean;
  isPending: boolean;
  currentUserId?: string;
  mayApproveOwn?: boolean;
  orgTz: string | null;
  onApply: (regularizationId: number, selfApproval: boolean) => void;
  onReject: (regularizationId: number) => void;
}

export function RegularizationRow({
  row,
  canDecide,
  isPending,
  currentUserId,
  mayApproveOwn = false,
  orgTz,
  onApply,
  onReject,
}: RegularizationRowProps) {
  const status = (row.status ?? "PENDING").toUpperCase();
  const isDecidable = status === "PENDING";
  const isSelf = Boolean(currentUserId && row.userId === currentUserId);
  const handleApply = useCallback(() => onApply(row.id, isSelf), [onApply, row.id, isSelf]);
  const handleReject = useCallback(() => onReject(row.id), [onReject, row.id]);
  const inShift = punchShift(row.originalCheckIn, row.requestedCheckIn);
  const outShift = punchShift(row.originalCheckOut, row.requestedCheckOut);

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label font-semibold tabular-nums text-foreground">
            {formatIstDate(`${row.attendanceDate.slice(0, 10)}T00:00:00Z`)}
          </span>
          <RegularizationStatusBadge status={status} />
          {isSelf && mayApproveOwn && isDecidable ? <SelfApprovalBadge /> : null}
        </div>
        {row.requesterName ? (
          <p className="text-dense font-medium text-foreground">
            <span className="sr-only">Requested by </span>
            {row.requesterName}
          </p>
        ) : null}
        {row.originalCheckIn ?? row.originalCheckOut ? (
          <p className="text-dense tabular-nums text-muted-foreground">
            Original · In{" "}
            {row.originalCheckIn ? formatTimeInOrgTz(row.originalCheckIn, orgTz) : "—"} · Out{" "}
            {row.originalCheckOut ? formatTimeInOrgTz(row.originalCheckOut, orgTz) : "—"}
          </p>
        ) : (
          <p className="text-dense text-muted-foreground">Original · No punch recorded</p>
        )}
        <p className="text-dense tabular-nums text-muted-foreground">
          Requested · In{" "}
          {row.requestedCheckIn ? formatTimeInOrgTz(row.requestedCheckIn, orgTz) : "—"} · Out{" "}
          {row.requestedCheckOut ? formatTimeInOrgTz(row.requestedCheckOut, orgTz) : "—"}
        </p>
        {inShift || outShift ? (
          <p className="text-dense tabular-nums text-foreground">
            Change · In {inShift ?? "—"} · Out {outShift ?? "—"}
          </p>
        ) : null}
        <p className="text-dense text-muted-foreground">{row.reason}</p>
        {status === "REJECTED" && row.rejectionReason ? (
          <p className="text-dense text-status-danger-ink">{row.rejectionReason}</p>
        ) : null}
      </div>

      {canDecide && isDecidable ? (
        isSelf && !mayApproveOwn ? (
          <NeedsAnotherApprover className="shrink-0" />
        ) : (
          <div className="flex shrink-0 gap-2">
            <LoadingButton
              size="sm"
              className="min-h-11 gap-1 md:h-8 md:min-h-0"
              isPending={isPending}
              onClick={handleApply}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </LoadingButton>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 gap-1 md:h-8 md:min-h-0"
              disabled={isPending}
              onClick={handleReject}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}
