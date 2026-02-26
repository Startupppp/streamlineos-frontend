"use client";

import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";

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
      illustration={<EmptyLeaveIllustration />}
      title="No leave requests"
      description="You haven't submitted any leave requests yet."
    />
  );
}


