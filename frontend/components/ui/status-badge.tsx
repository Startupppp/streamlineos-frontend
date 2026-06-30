"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  DONE: "default",
  COMPLETED: "default",
  APPROVED: "default",
  ACTIVE: "default",
  HIRED: "default",
  RESOLVED: "default",
  PUBLISHED: "default",
  PAID: "default",
  ACCEPTED: "default",
  OPEN: "default",
  IN_PROGRESS: "secondary",
  IN_REVIEW: "secondary",
  PENDING: "secondary",
  SCREENING: "secondary",
  SUBMITTED: "secondary",
  DRAFT: "secondary",
  PENDING_CEO: "secondary",
  SENT: "secondary",
  ISSUED: "secondary",
  PAUSED: "outline",
  TODO: "outline",
  INTERVIEW: "outline",
  OFFER: "outline",
  NEW: "outline",
  APPLIED: "outline",
  REJECTED: "destructive",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
  VOIDED: "outline",
  TERMINATED: "destructive",
  FAILED: "destructive",
  CLOSED: "destructive",
  FILLED: "destructive",
};

const PRIORITY_VARIANT_MAP: Record<string, StatusVariant> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

interface StatusBadgeProps {
  status: string | null | undefined;
  type?: "status" | "priority";
  className?: string;
  label?: string;
}

export function StatusBadge({ status, type = "status", className, label }: StatusBadgeProps) {
  if (!status) return null;
  const map = type === "priority" ? PRIORITY_VARIANT_MAP : STATUS_VARIANT_MAP;
  const variant = map[status] ?? "outline";
  const display = label ?? status.replace(/_/g, " ");
  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      {display}
    </Badge>
  );
}
