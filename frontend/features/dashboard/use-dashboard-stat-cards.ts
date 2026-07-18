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
        value: stats.totalEmployees ?? 0,
        icon: Users,
        href: "/hr",
      });
    }
    if (access.hrEnabled && access.canViewAttendance) {
      cards.push({
        id: "present",
        label: "Present Today",
        value: stats.presentToday ?? 0,
        icon: UserCheck,
        href: "/hr/attendance",
      });
    }
    if (access.projectsEnabled && access.canViewTickets) {
      cards.push({
        id: "projects",
        label: "Active Projects",
        value: stats.activeProjects ?? 0,
        icon: Briefcase,
        href: "/projects/all",
      });
    }
    if (access.projectsEnabled) {
      cards.push({
        id: "my-tasks",
        label: "My Open Tasks",
        value: openIssueCount,
        icon: ListChecks,
        href: "/projects/my-work",
      });
    }

    return cards;
  }, [stats, access, openIssueCount]);
}
