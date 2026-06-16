"use client";

import { useMemo } from "react";
import {
  Users,
  Briefcase,
  Contact2,
  Ticket,
  Target,
  TrendingUp,
  CheckCircle2,
  ListChecks,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  orgName: string;
}

interface RoleStats {
  myLeads?: number;
  myConverted?: number;
  myDeals?: number;
  targetProgress?: number;
  myProjects?: number;
  myTickets?: number;
  myTicketsDone?: number;
  myTicketsInProgress?: number;
}

interface StatCardConfig {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
}

export function useDashboardStatCards(
  stats: DashboardStats | undefined,
  role: string | undefined,
  roleStats: RoleStats | undefined
): StatCardConfig[] {
  return useMemo(() => {
    if (!stats) return [];
    const rs = roleStats;

    switch (role) {
      case "CEO":
      case "HR":
        return [
          {
            id: "employees",
            label: "Total Employees",
            value: stats.totalEmployees,
            icon: Users,
            href: "/hr",
          },
          {
            id: "projects",
            label: "Active Projects",
            value: stats.activeProjects,
            icon: Briefcase,
            href: "/projects",
          },
        ];
      case "SALES":
        return [
          {
            id: "leads",
            label: "My Leads",
            value: rs?.myLeads ?? 0,
            icon: Contact2,
            href: "/crm/leads",
          },
          {
            id: "converted",
            label: "Converted",
            value: rs?.myConverted ?? 0,
            icon: TrendingUp,
            href: "/crm/leads",
          },
          {
            id: "deals",
            label: "My Deals",
            value: rs?.myDeals ?? 0,
            icon: Zap,
            href: "/crm/deals",
          },
          {
            id: "target",
            label: "Target Progress",
            value: `${rs?.targetProgress ?? 0}%`,
            icon: Target,
            href: "/crm/targets",
          },
        ];
      case "CUSTOMER_SUPPORT":
        return [
          {
            id: "projects",
            label: "My Projects",
            value: rs?.myProjects ?? 0,
            icon: Briefcase,
            href: "/projects",
          },
          {
            id: "tickets",
            label: "My Tickets",
            value: rs?.myTickets ?? 0,
            icon: Ticket,
          },
          {
            id: "done",
            label: "Completed",
            value: rs?.myTicketsDone ?? 0,
            icon: CheckCircle2,
          },
          {
            id: "inprogress",
            label: "In Progress",
            value: rs?.myTicketsInProgress ?? 0,
            icon: ListChecks,
          },
        ];
      case "ENGINEERING":
      case "DESIGN":
      case "VIDEO_EDITOR":
      case "DIGITAL_MARKETING":
        return [
          {
            id: "projects",
            label: "My Projects",
            value: rs?.myProjects ?? 0,
            icon: Briefcase,
            href: "/projects",
          },
          {
            id: "tickets",
            label: "My Tasks",
            value: rs?.myTickets ?? 0,
            icon: ListChecks,
          },
          {
            id: "done",
            label: "Completed",
            value: rs?.myTicketsDone ?? 0,
            icon: CheckCircle2,
          },
          {
            id: "inprogress",
            label: "In Progress",
            value: rs?.myTicketsInProgress ?? 0,
            icon: Zap,
          },
        ];
      default:
        return [];
    }
  }, [stats, role, roleStats]);
}
