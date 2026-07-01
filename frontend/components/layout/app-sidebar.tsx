"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePendingApprovals } from "@/hooks/api/dashboard";
import { useChatUnreadTotal } from "@/hooks/api/chat";
import { useUnreadNotificationCount } from "@/hooks/api/notifications";
import {
  getNavGroupsForProduct,
  getProductFromPathname,
  flattenNavRoutes,
} from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { usePermissions } from "@/lib/rbac/hooks";
import { useCan } from "@/hooks/api/access";

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
  const role = session?.user?.role;
  const isOrgOwner =
    session?.user?.isOrgOwner === true ||
    session?.user?.isPlatformAdmin === true;

  const lastKnownRoleRef = useRef<string | undefined>(role);
  if (role) lastKnownRoleRef.current = role;
  const rawRole = role || lastKnownRoleRef.current;
  const effectiveRole = isOrgOwner ? "OWNER" : rawRole;

  const pathname = usePathname();
  const activeProduct = getProductFromPathname(pathname);

  const { permissions } = usePermissions();
  const isAdmin = useCan("settings:manage");

  const navGroups = useMemo(
    () => getNavGroupsForProduct(activeProduct, effectiveRole, permissions),
    [activeProduct, effectiveRole, permissions],
  );

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

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups");
      if (stored)
        setCollapsedGroups(JSON.parse(stored) as Record<string, boolean>);
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setCollapsedGroups((prev) => {
      if (prev[activeGroupLabel] === false) return prev;
      const next = { ...prev, [activeGroupLabel]: false };
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [activeGroupLabel]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const { data: pendingApprovalsData } = usePendingApprovals({
    enabled: isAdmin && !!session?.user,
    refetchIntervalInBackground: false,
  });
  const pendingLeaves = pendingApprovalsData?.pendingLeaves ?? 0;

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  const { data: notifData } = useUnreadNotificationCount();
  const unreadNotifCount = notifData?.count ?? 0;

  useEffect(() => {
    const base = "StreamlineOS";
    const total = unreadChatCount + unreadNotifCount;
    document.title =
      total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [unreadChatCount, unreadNotifCount]);

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-border" />
                <Skeleton className="h-3.5 w-24 rounded bg-sidebar-border" />
              </div>
            ))}
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
          isCollapsed ? "w-[3.5rem]" : "w-[17rem]",
        )}
      >
        <div
          className={cn(
            "relative flex items-center h-10 shrink-0 border-b border-sidebar-border",
            isCollapsed ? "justify-center" : "justify-end px-3",
          )}
        >
          {isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/70 hover:text-blue-600 hover:border-blue-500/40 hover:bg-sidebar transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
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

        <ScrollArea className="flex-1 min-h-0">
          <nav className={cn("py-2", isCollapsed ? "px-1.5" : "px-3")}>
            {navGroups.map((group, i) => {
              const multiGroup = navGroups.length > 1;
              return (
                <SidebarSection
                  key={group.label}
                  group={group}
                  groupIndex={i}
                  isCollapsed={isCollapsed}
                  showLabel={multiGroup}
                  isGroupCollapsed={
                    multiGroup ? (collapsedGroups[group.label] ?? false) : false
                  }
                  onToggleGroup={
                    multiGroup ? () => toggleGroup(group.label) : undefined
                  }
                  pendingLeaves={pendingLeaves}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
