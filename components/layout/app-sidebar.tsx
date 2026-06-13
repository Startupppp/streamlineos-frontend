"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useChatUnreadTotal } from "@/lib/api/hooks/chat";
import { useUnreadNotificationCount } from "@/lib/api/hooks/notifications";
import { flattenNavRoutes, getNavGroupsForUser } from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";
import { NotificationBell } from "./notification-bell";
import { usePermissions } from "@/lib/rbac/hooks";
import { useAbility } from "@/lib/abilities-context";

interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: AppSidebarProps) {
  const { data: session, status } = useSession();
  const { data: organizations } = useGetOrganizations();
  const role = session?.user?.role;

  const lastKnownRoleRef = useRef<string | undefined>(role);
  const hasEverLoadedRef = useRef(false);
  if (role) {
    lastKnownRoleRef.current = role;
    hasEverLoadedRef.current = true;
  }
  const effectiveRole = role || lastKnownRoleRef.current;

  const pathname = usePathname();

  const { permissions } = usePermissions();
  const ability = useAbility();
  const navGroups = useMemo(
    () => getNavGroupsForUser(effectiveRole, permissions),
    [effectiveRole, permissions]
  );
  const isAdmin = ability.can("manage", "settings");

  const activeGroupLabel = useMemo(() => {
    for (const group of navGroups) {
      const match = flattenNavRoutes(group.routes).some((route) => {
        if (route.isProjectsList) return pathname.startsWith("/projects/");
        return pathname === route.href || pathname.startsWith(route.href + "/");
      });
      if (match) return group.label;
    }
    return null;
  }, [navGroups, pathname]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups");
      if (stored) setCollapsedGroups(JSON.parse(stored));
    } catch { }
  }, []);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setCollapsedGroups((prev) => {
      if (prev[activeGroupLabel] === false) return prev;
      const next = { ...prev, [activeGroupLabel]: false };
      try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch { }
      return next;
    });
  }, [activeGroupLabel]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const [pendingLeaves, setPendingLeaves] = useState(0);

  useEffect(() => {
    if (!isAdmin || !session?.user) return;
    let cancelled = false;
    async function fetchCounts() {
      try {
        const { getPendingApprovalCount } = await import(
          "@/server/actions/leave-actions"
        );
        const count = await getPendingApprovalCount();
        if (!cancelled) setPendingLeaves(count);
      } catch {
        if (!cancelled) setPendingLeaves(0);
      }
    }
    fetchCounts();
    const id = setInterval(fetchCounts, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, isAdmin]);

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  const { data: notifData } = useUnreadNotificationCount();
  const unreadNotifCount = notifData?.count ?? 0;

  useEffect(() => {
    const base = "StreamlineOS";
    const total = unreadChatCount + unreadNotifCount;
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [unreadChatCount, unreadNotifCount]);

  const orgName = organizations?.[0]?.name;

  const handleSearchClick = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: navigator.platform?.toUpperCase().includes("MAC") ?? true,
        ctrlKey: !(navigator.platform?.toUpperCase().includes("MAC") ?? true),
        bubbles: true,
      })
    );
  }, []);

  if (
    !hasEverLoadedRef.current &&
    (status === "loading" || (status === "authenticated" && !role))
  ) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-8 w-8 rounded-xl bg-sidebar-border" />
            <Skeleton className="h-4 w-20 rounded bg-sidebar-border" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-border" />
                <Skeleton className="h-3.5 w-24 rounded bg-sidebar-border" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full bg-sidebar-border" />
            <Skeleton className="h-3 w-20 rounded bg-sidebar-border" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex flex-col h-full bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[3.5rem]" : "w-[17rem]"
        )}
      >
        <div
          className={cn(
            "flex items-center h-14 shrink-0 border-b border-sidebar-border",
            isCollapsed ? "justify-center px-0" : "justify-between px-4"
          )}
        >
          {!isCollapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-blue-500/15 ring-1 ring-blue-500/30 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="StreamlineOS"
                  fill
                  className="object-contain p-1.5"
                />
              </div>
              <div className="min-w-0">
                <span className="text-[17px] font-bold tracking-tight leading-none block text-sidebar-foreground group-hover:opacity-90 transition-opacity">
                  StreamlineOS
                </span>
                {orgName ? (
                  <span className="text-[11px] text-sidebar-foreground/40 truncate block mt-0.5 leading-none max-w-[120px]">
                    {orgName}
                  </span>
                ) : (
                  <span className="text-[11px] text-sidebar-foreground/30 block mt-0.5 leading-none">
                    Capital CRM
                  </span>
                )}
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="h-10 w-10 rounded-xl overflow-hidden bg-blue-500/15 ring-1 ring-blue-500/30 flex items-center justify-center"
              aria-label="Go to dashboard"
            >
              <Image
                src="/logo.svg"
                alt="StreamlineOS"
                width={26}
                height={26}
                className="object-contain"
              />
            </Link>
          )}

          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="h-6 w-6 rounded-md flex items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {onToggleCollapse && isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/70 hover:text-blue-600 hover:border-blue-500/40 hover:bg-sidebar transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <nav
            className={cn("py-2", isCollapsed ? "px-1.5" : "px-3")}
          >
            {navGroups.map((group, i) => {
              const groupLabel = group.label;
              const isGroupCollapsed = groupLabel in collapsedGroups
                ? collapsedGroups[groupLabel]
                : true;
              return (
                <SidebarSection
                  key={groupLabel}
                  group={group}
                  groupIndex={i}
                  isCollapsed={isCollapsed}
                  isGroupCollapsed={isGroupCollapsed}
                  onToggleGroup={() => toggleGroup(groupLabel)}
                  pendingLeaves={pendingLeaves}
                  unreadChatCount={unreadChatCount}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>
        </ScrollArea>

        <div
          className={cn(
            "border-t border-sidebar-border shrink-0",
            isCollapsed ? "px-1.5 py-2 flex flex-col items-center gap-1" : "px-3 py-2 flex items-center gap-1"
          )}
        >
          {isCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    aria-label="Search"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="text-xs">
                  Search (⌘K)
                </TooltipContent>
              </Tooltip>
              <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-lg [&_button]:text-sidebar-foreground/50 [&_button:hover]:text-sidebar-foreground [&_button:hover]:bg-black/[0.04]">
                <NotificationBell />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSearchClick}
                aria-label="Search"
                className="flex-1 flex items-center gap-2 h-8 rounded-lg bg-muted border border-sidebar-border px-2.5 text-sidebar-foreground/55 text-xs hover:text-sidebar-foreground/85 hover:bg-sidebar-accent hover:border-sidebar-ring/30 transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-sidebar-border bg-muted px-1 font-mono text-[9px] text-sidebar-foreground/45">
                  ⌘K
                </kbd>
              </button>
              <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-lg [&_button]:text-sidebar-foreground/50 [&_button:hover]:text-sidebar-foreground [&_button:hover]:bg-black/[0.04]">
                <NotificationBell />
              </div>
            </>
          )}
        </div>

        <SidebarUserMenu isCollapsed={isCollapsed} isAdmin={isAdmin} />
      </div>
    </TooltipProvider>
  );
}
