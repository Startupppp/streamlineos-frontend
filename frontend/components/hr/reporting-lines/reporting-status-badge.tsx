"use client";

import { memo } from "react";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

export const REPORTING_ROW_STATUS_MAP: Record<string, StatusEntry> = {
  READY: { label: "Ready", tone: "success" },
  WARNING: { label: "Warning", tone: "warning" },
  ERROR: { label: "Error", tone: "danger" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
  COMMITTED: { label: "Committed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

export const REPORTING_REQUEST_STATUS_MAP: Record<string, StatusEntry> = {
  PENDING: { label: "Pending review", tone: "info" },
  MORE_INFO_REQUIRED: { label: "More info needed", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

interface ReportingStatusBadgeProps {
  status: string;
  className?: string;
}

export const ReportingRowStatusBadge = memo(function ReportingRowStatusBadge({ status, className }: ReportingStatusBadgeProps) {
  return <StatusMapBadge status={status} map={REPORTING_ROW_STATUS_MAP} className={className} />;
});

export const ReportingRequestStatusBadge = memo(function ReportingRequestStatusBadge({ status, className }: ReportingStatusBadgeProps) {
  return <StatusMapBadge status={status} map={REPORTING_REQUEST_STATUS_MAP} className={className} />;
});
