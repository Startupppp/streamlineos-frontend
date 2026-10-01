"use client";

import { useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatDateTime } from "@/lib/date-utils";
import { formatIstDate } from "@/lib/hrms/payroll-cutoff";
import type { AttendanceRegularization } from "@/hooks/api/hr/attendance";

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

interface RegularizationRowProps {
  row: AttendanceRegularization;
  canDecide: boolean;
  isPending: boolean;
  onApply: (regularizationId: number) => void;
  onReject: (regularizationId: number) => void;
}

export function RegularizationRow({
  row,
  canDecide,
  isPending,
  onApply,
  onReject,
}: RegularizationRowProps) {
  const handleApply = useCallback(() => onApply(row.id), [onApply, row.id]);
  const handleReject = useCallback(() => onReject(row.id), [onReject, row.id]);
  const status = (row.status ?? "PENDING").toUpperCase();
  const isDecidable = status === "PENDING";

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label font-semibold tabular-nums text-foreground">
            {formatIstDate(`${row.attendanceDate.slice(0, 10)}T00:00:00Z`)}
          </span>
          <RegularizationStatusBadge status={status} />
        </div>
        <p className="text-dense tabular-nums text-muted-foreground">
          In {row.requestedCheckIn ? formatDateTime(row.requestedCheckIn) : "—"} · Out{" "}
          {row.requestedCheckOut ? formatDateTime(row.requestedCheckOut) : "—"}
        </p>
        <p className="text-dense text-muted-foreground">{row.reason}</p>
        {status === "REJECTED" && row.rejectionReason ? (
          <p className="text-dense text-status-danger-ink">{row.rejectionReason}</p>
        ) : null}
      </div>

      {canDecide && isDecidable ? (
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
      ) : null}
    </li>
  );
}
