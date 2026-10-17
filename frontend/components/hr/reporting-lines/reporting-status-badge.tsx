"use client";

import { memo } from "react";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

/**
 * Row outcomes shared by the bulk-onboarding preview, the staged-import preview
 * and bulk reporting-change jobs (HRM-15 CONTRACT §4 items 19 and 20). One map,
 * so "Warning" means the same thing on every surface and never reads as an error.
 */
export const REPORTING_ROW_STATUS_MAP: Record<string, StatusEntry> = {
  READY: { label: "Ready", tone: "success" },
  WARNING: { label: "Warning", tone: "warning" },
  ERROR: { label: "Error", tone: "danger" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
  COMMITTED: { label: "Committed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

/** Employee correction-request lifecycle (CONTRACT §1.4). */
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
