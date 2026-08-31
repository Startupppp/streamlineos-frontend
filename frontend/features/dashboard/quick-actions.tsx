"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import {
  UserPlus,
  BarChart3,
  CalendarDays,
  Contact2,
  Clock,
  Briefcase,
  CheckSquare,
  Network,
} from "lucide-react";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const MAX_QUICK_ACTIONS = 5;

export function useQuickActions(): QuickAction[] {
  const access = useDashboardAccess();

  return useMemo(() => {
    const actions: QuickAction[] = [];
    if (access.projectsEnabled && access.canViewTickets) {
      actions.push({ label: "Projects", icon: Briefcase, href: "/build/all" });
    }
    if (access.hrEnabled && access.canCreateEmployees) {
      actions.push({ label: "Add Employee", icon: UserPlus, href: "/hr/onboarding" });
    }
    if (access.crmEnabled && access.canViewCrmLeads) {
      actions.push({ label: "My Leads", icon: Contact2, href: "/crm/leads" });
    }
    if (access.crmEnabled && access.canViewCrmReports) {
      actions.push({ label: "CRM Reports", icon: BarChart3, href: "/crm/reports" });
    }
    if (access.hrEnabled && access.canViewAttendance) {
      actions.push({ label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" });
    }
    if (access.hrEnabled && access.canViewEmployees) {
      actions.push({ label: "Org Chart", icon: Network, href: "/hr/org-chart" });
    }
    if (access.projectsEnabled) {
      actions.push({ label: "My Tasks", icon: CheckSquare, href: "/build/my-work" });
    }
    if (access.hrEnabled && !access.canViewAttendance) {
      actions.push({ label: "Check In", icon: Clock, href: "/me/attendance" });
    }
    return actions.slice(0, MAX_QUICK_ACTIONS);
  }, [access]);
}

export const QuickActions = memo(function QuickActions() {
  const { fadeUp } = useMotionVariants();
  const actions = useQuickActions();

  if (actions.length === 0) return null;

  return (
    <div
      className={`flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-1 scrollbar-hide sm:grid sm:overflow-visible sm:pb-0 ${actions.length >= 5 ? "sm:grid-cols-5" : actions.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
    >
      {actions.map((action) => {
        const ActionIcon = action.icon;
        return (
          <motion.div
            key={action.label}
            variants={fadeUp}
            className="min-w-[min(100%,11rem)] shrink-0 snap-start sm:min-w-0 sm:shrink"
          >
            <Link href={action.href} aria-label={action.label}>
              <div className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-noir transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:bg-primary/5 cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <ActionIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
});
