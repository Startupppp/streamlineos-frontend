"use client";

import { useMemo } from "react";
import { Users, UserCheck, Briefcase, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardStats } from "@/types/dashboard";
import type { DashboardAccess } from "@/features/dashboard/use-dashboard-access";

interface StatCardConfig {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  /** True when this section did not answer — the value is a placeholder. */
  unavailable?: boolean;
  hint?: string;
}

/**
 * What the card shows when its section did not answer. An em dash, never a
 * number: an operator reads a number as a fact.
 */
const UNAVAILABLE_VALUE = "—";
const UNAVAILABLE_HINT = "Couldn't load — retry";

/**
 * `/dashboard/stats` fans out over three independent sections, each one
 * deadline-protected by `settleSection`: a section that REJECTS, or merely
 * exceeds HOME_SECTION_DEADLINE_MS (2,500 ms), resolves to its fallback, and the
 * fallback for all three counts is `null`. A genuinely empty organisation
 * returns `0` — `Number(r?.cnt ?? 0)` — so on this endpoint `null` and `0` are
 * different facts and only one of them is a count.
 *
 * `?? 0` collapsed them on the most prominent card in the product. An org with
 * 500 employees whose count query stalled rendered "Total Employees 0", which
 * reads as "the org is empty" or "every employee was deleted", and nothing on
 * the screen knew anything had failed so there was no retry affordance either.
 *
 * `null` has a second possible reading — "you may not view this", the branch
 * where the server's flag is false — but it cannot apply inside these `if`s: the
 * card is only pushed when the caller holds the permission, so within the branch
 * `null` can only be a degraded section.
 */
function statValue(
  count: number | null | undefined,
): Pick<StatCardConfig, "value" | "unavailable" | "hint"> {
  return count === null || count === undefined
    ? { value: UNAVAILABLE_VALUE, unavailable: true, hint: UNAVAILABLE_HINT }
    : { value: count };
}

export function useDashboardStatCards(
  stats: DashboardStats | undefined,
  access: DashboardAccess,
  openIssueCount: number
): StatCardConfig[] {
  return useMemo(() => {
    if (!stats) return [];
    const cards: StatCardConfig[] = [];

    if (access.hrEnabled && access.canViewEmployees) {
      cards.push({
        id: "employees",
        label: "Total Employees",
        ...statValue(stats.totalEmployees),
        icon: Users,
        href: "/hr",
      });
    }
    if (access.hrEnabled && access.canViewAttendance) {
      cards.push({
        id: "present",
        label: "Present Today",
        ...statValue(stats.presentToday),
        icon: UserCheck,
        href: "/hr/attendance",
      });
    }
    if (access.projectsEnabled && access.canViewTickets) {
      cards.push({
        id: "projects",
        label: "Active Projects",
        ...statValue(stats.activeProjects),
        icon: Briefcase,
        href: "/build/all",
      });
    }
    if (access.projectsEnabled) {
      // Sourced from /dashboard/my-issues, not from the stats fanout — it has no
      // degraded reading, so it stays a plain number.
      cards.push({
        id: "my-tasks",
        label: "My Open Tasks",
        value: openIssueCount,
        icon: ListChecks,
        href: "/build/my-work",
      });
    }

    return cards;
  }, [stats, access, openIssueCount]);
}

export type { StatCardConfig };
