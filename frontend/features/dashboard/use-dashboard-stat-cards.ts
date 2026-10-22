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
  unavailable?: boolean;
  hint?: string;
  isLoading?: boolean;
}

const UNAVAILABLE_VALUE = "—";
const UNAVAILABLE_HINT = "Couldn't load — retry";

function statValue(
  count: number | null | undefined,
): Pick<StatCardConfig, "value" | "unavailable" | "hint"> {
  return count === null || count === undefined
    ? { value: UNAVAILABLE_VALUE, unavailable: true, hint: UNAVAILABLE_HINT }
    : { value: count };
}

export function executiveKpiStats(input: {
  included: boolean;
  headcount?: number;
  openRoles?: number;
  isLoading?: boolean;
  unavailable?: boolean;
}): StatCardConfig[] {
  if (!input.included) return [];
  const pending = Boolean(input.isLoading || input.unavailable);
  const hint = input.unavailable ? UNAVAILABLE_HINT : undefined;
  return [
    {
      id: "headcount",
      label: "Headcount",
      value: pending || input.headcount === undefined ? UNAVAILABLE_VALUE : input.headcount,
      icon: Users,
      isLoading: input.isLoading,
      unavailable: input.unavailable,
      hint,
    },
    {
      id: "open-roles",
      label: "Open Roles",
      value: pending || input.openRoles === undefined ? UNAVAILABLE_VALUE : input.openRoles,
      icon: Briefcase,
      isLoading: input.isLoading,
      unavailable: input.unavailable,
      hint,
    },
  ];
}

export function useDashboardStatCards(
  stats: DashboardStats | undefined,
  access: DashboardAccess,
  openIssueCount: number,
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
      });
    }
    if (access.hrEnabled && access.canViewAttendance) {
      cards.push({
        id: "present",
        label: "Present Today",
        ...statValue(stats.presentToday),
        icon: UserCheck,
      });
    }
    if (access.projectsEnabled && access.canViewTickets) {
      cards.push({
        id: "projects",
        label: "Active Projects",
        ...statValue(stats.activeProjects),
        icon: Briefcase,
      });
    }
    if (access.projectsEnabled) {
      cards.push({
        id: "my-tasks",
        label: "My Open Tasks",
        value: openIssueCount,
        icon: ListChecks,
      });
    }

    return cards;
  }, [stats, access, openIssueCount]);
}

export type { StatCardConfig };
