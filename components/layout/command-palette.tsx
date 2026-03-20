"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, Clock, Receipt,
  Settings, Contact2, Target, BarChart3, Handshake,
  UserPlus, Megaphone, HeadphonesIcon, CalendarDays,
  Briefcase, FileText, DollarSign, UserCheck, Network,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

const PAGES = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigation" },
  { name: "Employees", href: "/hr/employees", icon: Users, group: "HR" },
  { name: "Attendance", href: "/hr/attendance", icon: CalendarDays, group: "HR" },
  { name: "Leave Management", href: "/hr/leave", icon: FileText, group: "HR" },
  { name: "Payroll", href: "/hr/payroll", icon: DollarSign, group: "HR" },
  { name: "Expenses", href: "/hr/expenses", icon: Receipt, group: "HR" },
  { name: "Devices", href: "/hr/devices", icon: Briefcase, group: "HR" },
  { name: "Work Logs", href: "/hr/work-logs", icon: Clock, group: "HR" },
  { name: "Org Chart", href: "/hr/org-chart", icon: Network, group: "HR" },
  { name: "Projects", href: "/projects", icon: FolderKanban, group: "Projects" },
  { name: "Timesheets", href: "/timesheets", icon: Clock, group: "Projects" },
  { name: "CRM Hub", href: "/crm", icon: Target, group: "CRM" },
  { name: "Lead Pipeline", href: "/crm/leads", icon: Contact2, group: "CRM" },
  { name: "Deals Pipeline", href: "/crm/deals", icon: Handshake, group: "CRM" },
  { name: "Contacts", href: "/crm/contacts", icon: Users, group: "CRM" },
  { name: "Organizations", href: "/crm/organizations", icon: UserPlus, group: "CRM" },
  { name: "CRM Analytics", href: "/crm/analytics", icon: BarChart3, group: "CRM" },
  { name: "Scoring Rules", href: "/crm/settings/scoring-rules", icon: Target, group: "CRM Settings" },
  { name: "Assignment Rules", href: "/crm/settings/assignment-rules", icon: UserCheck, group: "CRM Settings" },
  { name: "Email Templates", href: "/crm/settings/email-templates", icon: FileText, group: "CRM Settings" },
  { name: "SLA Policies", href: "/crm/settings/sla", icon: Clock, group: "CRM Settings" },
  { name: "Targets", href: "/crm/targets", icon: Target, group: "CRM" },
  { name: "Clients", href: "/crm/clients", icon: UserCheck, group: "CRM" },
  { name: "Sales Dashboard", href: "/sales", icon: DollarSign, group: "Dashboards" },
  { name: "Marketing Dashboard", href: "/marketing", icon: Megaphone, group: "Dashboards" },
  { name: "Support Dashboard", href: "/support", icon: HeadphonesIcon, group: "Dashboards" },
  { name: "Billing", href: "/billing", icon: Receipt, group: "System" },
  { name: "Settings", href: "/settings", icon: Settings, group: "System" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const groups = PAGES.reduce<Record<string, typeof PAGES>>((acc, page) => {
    (acc[page.group] ??= []).push(page);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groups).map(([group, pages]) => (
          <CommandGroup key={group} heading={group}>
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                value={page.name}
                onSelect={() => {
                  router.push(page.href);
                  setOpen(false);
                }}
              >
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
