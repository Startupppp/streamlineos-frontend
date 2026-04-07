"use client";

import { CalendarDays, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function LeaveErrorState() {
  return (
    <EmptyState
      icon={CalendarDays}
      title="Error loading leave data"
      description="Please try again or contact support if the issue persists."
    />
  );
}

export function NoLeaveRequestsState() {
  return (
    <EmptyState
      icon={FileText}
      title="No leave requests"
      description="You haven't submitted any leave requests yet."
    />
  );
}


