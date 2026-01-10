"use client";

import { useState, useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Clock,
  CalendarCheck,
  CreditCard,
  LogOut,
  Timer,
  UserPlus,
  QrCode,
  Receipt,
  FileText,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useGetOrganizations } from "../../lib/hooks/auth-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";

interface NavGroup {
  label: string;
  routes: {
    label: string;
    icon: React.ElementType;
    href: string;
    badge?: "leaves" | "onboarding";
  }[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: "Core",
    routes: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
    ],
  },
  {
    label: "HR Management",
    routes: [
      { label: "Employees", icon: Users, href: "/hr", badge: "onboarding" },
      { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding" },
      { label: "Attendance", icon: Clock, href: "/hr/attendance" },
      { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
      { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
      { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
      { label: "Documents", icon: FileText, href: "/hr/documents" },
    ],
  },
  {
    label: "Projects",
    routes: [
      { label: "Projects", icon: Briefcase, href: "/projects" },
      { label: "My Timesheets", icon: Timer, href: "/timesheets" },
      { label: "Team Timesheets", icon: Clock, href: "/timesheets/team" },
    ],
  },
  {
    label: "System",
    routes: [
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

const employeeNavGroups: NavGroup[] = [
  {
    label: "Core",
    routes: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    label: "My Work",
    routes: [
      { label: "My Projects", icon: Briefcase, href: "/projects" },
      { label: "My Timesheets", icon: Timer, href: "/timesheets" },
    ],
  },
  {
    label: "HR",
    routes: [
      { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
      { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
      { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
      { label: "My Documents", icon: FileText, href: "/hr/documents" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: organizations } = useGetOrganizations();
  
  const role = session?.user?.role;

  // Build nav groups based on role
  // QR Codes is OWNER-only, so we need to filter it
  let navGroups = role === "OWNER" || role === "ADMIN" ? adminNavGroups : employeeNavGroups;
  
  // If user is ADMIN (not OWNER), remove QR Codes from nav
  if (role === "ADMIN") {
    navGroups = adminNavGroups.map(group => ({
      ...group,
      routes: group.routes.filter(route => route.href !== "/ceo/qr-code")
    }));
  }

  const handleOrgChange = (_id: string) => {
    router.push("/dashboard");
    router.refresh();
  };

  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [unreadOnboarding, setUnreadOnboarding] = useState(0);

  useEffect(() => {
    async function fetchCounts() {
        try {
            const { getPendingApprovalCount } = await import("@/server/actions/leave-actions");
            const { getUnreadOnboardingCount } = await import("@/server/actions/notification-actions");
            
            const leavesCount = await getPendingApprovalCount();
            const onboardingCount = await getUnreadOnboardingCount();
            
            setPendingLeaves(leavesCount);
            setUnreadOnboarding(onboardingCount);
        } catch {
        }
    }
    if (session?.user) {
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-4 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <div className="px-2 mb-6">
             <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="flex items-center gap-3 px-3 py-2">
                 <Skeleton className="h-5 w-5 rounded" />
                 <Skeleton className="h-4 w-20 rounded" />
               </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-4 border-t border-sidebar-border">
           <div className="flex items-center gap-3">
               <Skeleton className="h-9 w-9 rounded-full" />
               <div className="space-y-1.5">
                   <Skeleton className="h-3 w-20" />
                   <Skeleton className="h-2.5 w-28" />
               </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
            <Image
              src="/logo.svg"
              alt="Vaivamm Logo"
              width={28}
              height={28}
              className="rounded"
            />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Vaivamm
          </h1>
        </Link>
      </div>

      {/* Organization Switcher */}
      {organizations && organizations.length > 0 && (
        <div className="px-4 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg border-sidebar-border bg-sidebar-accent/30 h-10"
              >
                <span className="truncate text-sm">
                  {organizations[0]?.name || "Select Organization"}
                </span>
                <span className="text-xs opacity-60">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrgChange(org.id)}
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/org-selection")}>
                Manage Organizations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.routes.map((route) => {
                const isActive = pathname === route.href || 
                  (route.href !== "/dashboard" && pathname.startsWith(route.href));
                const showBadge = 
                  (route.badge === "leaves" && pendingLeaves > 0) || 
                  (route.badge === "onboarding" && unreadOnboarding > 0);
                
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <route.icon className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                    )} />
                    <span className="flex-1">{route.label}</span>
                    {showBadge && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto hover:bg-sidebar-accent"
            >
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="font-medium text-sm text-sidebar-foreground truncate max-w-[140px]">
                  {session?.user?.name || "User"}
                </span>
                <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                  {session?.user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                signOut({ callbackUrl: "/signin" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

