"use client";

import { useMemo } from "react";
import { useUnifiedInboxCount } from "@/hooks/api/inbox";
import {
  usePendingApprovals,
  usePersonalDashboard,
} from "@/hooks/api/dashboard";
import type { DashboardAccess } from "./use-dashboard-access";

export type AttentionPriority = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  label: string;
  count: number;
  href: string;
  priority: AttentionPriority;
}

const PRIORITY_ORDER: Record<AttentionPriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function useFocusStrip(access: DashboardAccess): {
  items: AttentionItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { data: inboxData, isLoading: inboxLoading, isError: inboxError, refetch: refetchInbox } = useUnifiedInboxCount();

  const { data: approvalsData, isLoading: approvalsLoading, isError: approvalsError, refetch: refetchApprovals } =
    usePendingApprovals({
      enabled: access.hrEnabled && access.canApproveLeaves,
    });

  const { data: personalData, isLoading: personalLoading, isError: personalError, refetch: refetchPersonal } =
    usePersonalDashboard();

  const isLoading = inboxLoading || approvalsLoading || personalLoading;
  const isError = inboxError || approvalsError || personalError;

  const items = useMemo((): AttentionItem[] => {
    const result: AttentionItem[] = [];

    const approvalTotal = approvalsData?.total ?? 0;
    if (approvalTotal > 0 && access.hrEnabled && access.canApproveLeaves) {
      result.push({
        id: "approvals",
        label:
          approvalTotal === 1
            ? "1 pending approval"
            : `${approvalTotal} pending approvals`,
        count: approvalTotal,
        href: "/hr/leaves?tab=pending",
        priority: "critical",
      });
    }

    const timesheetStatus = personalData?.timesheetStatus;
    if (
      timesheetStatus &&
      !timesheetStatus.submitted &&
      timesheetStatus.hoursLogged > 0
    ) {
      result.push({
        id: "timesheet",
        label: "Timesheet not submitted",
        count: 1,
        href: "/timesheets",
        priority: "warning",
      });
    }

    const eventsCount = personalData?.upcomingEvents?.length ?? 0;
    if (eventsCount > 0) {
      result.push({
        id: "meetings",
        label:
          eventsCount === 1
            ? "1 upcoming event"
            : `${eventsCount} upcoming events`,
        count: eventsCount,
        href: "/calendar",
        priority: "info",
      });
    }

    const notifCount = inboxData?.notification ?? 0;
    if (notifCount > 0) {
      result.push({
        id: "notifications",
        label:
          notifCount === 1
            ? "1 notification"
            : `${notifCount} notifications`,
        count: notifCount,
        href: "/inbox?view=notifications",
        priority: "info",
      });
    }

    const mailCount = inboxData?.mail ?? 0;
    if (mailCount > 0) {
      const countLabel =
        inboxData?.mailExact === false ? `${mailCount}+` : String(mailCount);
      result.push({
        id: "mail",
        label: `${countLabel} unread message${mailCount === 1 && inboxData?.mailExact !== false ? "" : "s"}`,
        count: mailCount,
        href: "/inbox?view=mail",
        priority: "info",
      });
    }

    return result.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
  }, [inboxData, approvalsData, personalData, access]);

  function refetch() {
    void refetchInbox();
    void refetchApprovals();
    void refetchPersonal();
  }

  return { items, isLoading, isError, refetch };
}
