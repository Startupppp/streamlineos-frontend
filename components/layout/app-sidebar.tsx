"use client";

import { useState, useEffect, useMemo, useRef } from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn, resolveImageUrl } from "@/lib/utils";
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
  Laptop,
  Wallet,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Handshake,
  HeadphonesIcon,
  Contact2,
  Trophy,
  BarChart3,
  UserCheck,
  Building2,
  ClipboardList,
  Network,
  Ticket,
  MessageCircle,
  MessageSquareText,
  Shield,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatUnreadTotal } from "@/lib/hooks/chat-hooks";

interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
}

interface NavGroup {
  label: string;
  routes: NavRoute[];
}

/**
 * Role-based sidebar navigation.
 * Each role gets EXACTLY what they should see — nothing more.
 */
function getNavGroupsForRole(role: string | undefined): NavGroup[] {
  if (!role) return [];

  switch (role) {
    case "CEO":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
          ],
        },
        {
          label: "HR Management",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            // { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Work Logs", icon: ClipboardList, href: "/hr/work-logs" },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          label: "Dashboards",
          routes: [
            { label: "Sales", icon: DollarSign, href: "/sales" },
            { label: "Customer Exec", icon: Handshake, href: "/customer-executive" },
          ],
        },
        {
          label: "Projects",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
          ],
        },
        // {
        //   label: "Support",
        //   routes: [
        //     { label: "Tickets", icon: Ticket, href: "/support" },
        //     { label: "Inbox", icon: MessageCircle, href: "/support/inbox" },
        //   ],
        // },
        {
          label: "System",
          routes: [
            // { label: "Billing", icon: Receipt, href: "/billing" },
            // { label: "Invoices", icon: FileText, href: "/billing/invoices" },
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
          ],
        },
      ];

    case "HR":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
          ],
        },
        {
          label: "HR Management",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            // { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Work Logs", icon: ClipboardList, href: "/hr/work-logs" },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          label: "Projects",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
          ],
        },
        // {
        //   label: "Support",
        //   routes: [
        //     { label: "Tickets", icon: Ticket, href: "/support" },
        //   ],
        // },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
          ],
        },
      ];

    case "SALES":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Leads", icon: Contact2, href: "/crm/leads" },
            { label: "My Deals", icon: Handshake, href: "/crm/deals" },
            { label: "My Targets", icon: Trophy, href: "/crm/targets" },
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            // { label: "Tickets", icon: Ticket, href: "/support" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    case "CUSTOMER_SUPPORT":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            // { label: "My Tickets", icon: Ticket, href: "/support" },
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
    case "DIGITAL_MARKETING":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            // { label: "Tickets", icon: Ticket, href: "/support" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    default:
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            // { label: "Tickets", icon: Ticket, href: "/support" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];
  }
}

interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({ isCollapsed = false, onToggleCollapse, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { data: organizations } = useGetOrganizations();
  const role = session?.user?.role;

  // Preserve last known role so sidebar doesn't flash skeleton during transient session refreshes
  const lastKnownRoleRef = useRef<string | undefined>(role);
  const hasEverLoadedRef = useRef(false);
  if (role) {
    lastKnownRoleRef.current = role;
    hasEverLoadedRef.current = true;
  }
  const effectiveRole = role || lastKnownRoleRef.current;

  const navGroups = useMemo(() => getNavGroupsForRole(effectiveRole), [effectiveRole]);
  const isAdmin = effectiveRole === "CEO" || effectiveRole === "HR";

  const [pendingLeaves, setPendingLeaves] = useState(0);
  useEffect(() => {
    if (!isAdmin || !session?.user) return;
    let cancelled = false;
    async function fetchCounts() {
        try {
            const { getPendingApprovalCount } = await import("@/server/actions/leave-actions");
            const leavesCount = await getPendingApprovalCount();
            if (!cancelled) {
              setPendingLeaves(leavesCount);
            }
        } catch {
          // Leave count fetch failed — default to 0
          if (!cancelled) setPendingLeaves(0);
        }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session, isAdmin]);

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  // Update browser tab title with unread count
  useEffect(() => {
    const baseTitle = "Vaivamm CRM";
    document.title = unreadChatCount > 0 ? `(${unreadChatCount}) ${baseTitle}` : baseTitle;
  }, [unreadChatCount]);

  // Only show skeleton on very first load, never during navigation
  if (!hasEverLoadedRef.current && (status === "loading" || (status === "authenticated" && !role))) {
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
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 relative", isCollapsed ? "w-20" : "w-72")}>

      <div className={cn("px-4 py-4 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={onNavigate}>
          <div className="relative w-8 h-8 bg-card rounded-lg border border-gold/20 flex items-center justify-center overflow-hidden shadow-noir shrink-0">
            <Image
              src="/logo.svg"
              alt="Vaivamm Logo"
              width={28}
              height={28}
              className="rounded"
            />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold font-serif gold-text truncate">
              Vaivamm
            </h1>
          )}
        </Link>
        {onToggleCollapse && !isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {onToggleCollapse && isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-5 z-10 h-6 w-6 rounded-full border bg-sidebar shadow-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>


      {organizations && organizations.length > 0 && !isCollapsed && (
        <div className="px-4 mb-4">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 h-10">
            <Building2 className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />
            <span className="truncate text-sm text-sidebar-foreground">
              {organizations[0]?.name || "Organization"}
            </span>
          </div>
        </div>
      )}


      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />


      <ScrollArea className="flex-1">
        <nav className={cn("pb-4 pt-2", isCollapsed ? "px-2" : "px-3")}>
          {navGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {group.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.routes.map((route) => {
                  const isExactMatch = pathname === route.href;
                  const isActive = isExactMatch || (route.isProjectsList && pathname.startsWith("/projects/"));
                  const showBadge = (route.badge === "leaves" && pendingLeaves > 0);
                  const isChatRoute = route.href === "/chat";
                  const chatBadgeCount = isChatRoute ? unreadChatCount : 0;
                  const isProjectsRoute = route.isProjectsList;
                  const isProjectActive = pathname.startsWith("/projects/") && !pathname.match(/^\/projects\/?$/);

                  if (isProjectsRoute) {
                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        title={isCollapsed ? route.label : undefined}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center rounded-lg transition-colors relative",
                          isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                          "text-sm font-medium",
                          isProjectActive || isExactMatch
                            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-gold"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <route.icon className={cn(
                          "h-4 w-4 shrink-0",
                          (isProjectActive || isExactMatch) ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"
                        )} />
                        {!isCollapsed && <span className="flex-1 text-left">{route.label}</span>}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      title={isCollapsed ? route.label : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center rounded-lg transition-colors relative",
                        isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                        "text-sm font-medium",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-gold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <route.icon className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{route.label}</span>
                          {chatBadgeCount > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                              {chatBadgeCount > 99 ? "99+" : chatBadgeCount}
                            </span>
                          )}
                          {showBadge && (
                            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                              {pendingLeaves > 99 ? "99+" : pendingLeaves}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && chatBadgeCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                          {chatBadgeCount > 9 ? "9+" : chatBadgeCount}
                        </span>
                      )}
                      {isCollapsed && showBadge && !isChatRoute && (
                        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                          {pendingLeaves > 9 ? "9+" : pendingLeaves}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>


      <div className={cn("py-4 border-t border-sidebar-border", isCollapsed ? "px-2" : "px-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-auto hover:bg-sidebar-accent",
                isCollapsed ? "justify-center px-2 py-2" : "justify-start gap-3 px-3 py-2"
              )}
            >
              <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                <AvatarImage src={resolveImageUrl(session?.user?.image)} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="font-medium text-sm text-sidebar-foreground truncate max-w-[140px]">
                    {session?.user?.name || "User"}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                    {session?.user?.email}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            )}
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
