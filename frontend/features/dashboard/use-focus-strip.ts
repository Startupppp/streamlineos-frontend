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
} {
  const { data: inboxData, isLoading: inboxLoading } = useUnifiedInboxCount();

  const { data: approvalsData, isLoading: approvalsLoading } =
    usePendingApprovals({
      enabled: access.hrEnabled && access.canApproveLeaves,
    });

  const { data: personalData, isLoading: personalLoading } =
    usePersonalDashboard();

  const isLoading = inboxLoading || approvalsLoading || personalLoading;

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
        href: "/me/timesheet",
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
        href: "/me/calendar",
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
        href: "/me/inbox",
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
        href: "/me/inbox?kind=mail",
        priority: "info",
      });
    }

    return result.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
  }, [inboxData, approvalsData, personalData, access]);

  return { items, isLoading };
}
