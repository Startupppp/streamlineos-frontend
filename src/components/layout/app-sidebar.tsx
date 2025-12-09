"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Clock,
  CalendarCheck,
  CreditCard,
} from "lucide-react";
import { UserButton, useUser, OrganizationSwitcher } from "@clerk/nextjs";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Projects",
    icon: Briefcase,
    href: "/projects",
    color: "text-violet-500",
  },
  {
    label: "HR & Employees",
    icon: Users,
    href: "/hr",
    color: "text-pink-700",
  },
  {
    label: "Attendance",
    icon: Clock,
    href: "/hr/attendance",
    color: "text-orange-700",
  },
  {
    label: "Leaves",
    icon: CalendarCheck,
    href: "/hr/leaves",
    color: "text-emerald-500",
  },
  {
    label: "Payroll",
    icon: CreditCard,
    href: "/hr/payroll",
    color: "text-green-700",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-6">
          <div className="relative w-8 h-8 mr-4">
            <Image 
              src="/logo.svg" 
              alt="Vaivamm Logo" 
              width={32} 
              height={32}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Vaivamm
          </h1>
        </Link>
        
        <div className="px-3 mb-6">
            <OrganizationSwitcher 
                hidePersonal={true}
                afterSelectOrganizationUrl="/dashboard"
                afterCreateOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/org-selection"
                appearance={{
                    elements: {
                        rootBox: "w-full",
                        organizationSwitcherTrigger: "w-full justify-between text-white hover:bg-white/10 p-2 rounded-lg border border-white/10",
                        organizationPreviewTextContainer: "text-white"
                    }
                }}
            />
        </div>

        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-white/10"
                  : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex items-center gap-x-3 p-3 text-sm">
             <UserButton afterSignOutUrl="/" />
             <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-white truncate">{user?.fullName}</span>
                <span className="text-xs text-zinc-400 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
             </div>
        </div>
      </div>
    </div>
  );
}
