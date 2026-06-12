"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "@/components/ui/widget-card";
import {
  Zap,
  Contact2,
  BarChart3,
  CalendarCheck,
  Users,
  ListChecks,
  Clock,
  Receipt,
} from "lucide-react";
import Link from "next/link";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function getActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
    case "ADMIN":
      return [
        { label: "View Pipeline", icon: Contact2, href: "/crm/leads" },
        { label: "Add Lead", icon: Contact2, href: "/crm/leads" },
        { label: "View Reports", icon: BarChart3, href: "/crm/reports" },
      ];
    case "HR":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Run Payroll", icon: Receipt, href: "/hr/payroll" },
        { label: "Add Employee", icon: Users, href: "/hr/onboarding" },
      ];
    case "BRANCH_MANAGER":
    case "BRANCH_HR":
      return [
        { label: "Assign Task", icon: ListChecks, href: "/projects" },
        { label: "Approve Leave", icon: CalendarCheck, href: "/hr/leaves" },
      ];
    default:
      return [
        { label: "Log Time", icon: Clock, href: "/timesheets" },
        { label: "Request Leave", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Log Activity", icon: ListChecks, href: "/crm/activities" },
      ];
  }
}

export function QuickActionsWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const actions = getActionsForRole(role);

  return (
    <WidgetCard icon={Zap} title="Quick Actions">
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-9 text-sm"
              asChild
            >
              <Link href={action.href} aria-label={action.label}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
