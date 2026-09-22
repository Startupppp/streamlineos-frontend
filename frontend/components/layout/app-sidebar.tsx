"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePendingApprovals } from "@/hooks/api/dashboard";
import { useChatUnreadTotal } from "@/hooks/api/chat-core-read";
import { useUnifiedInboxCount } from "@/hooks/api/inbox";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import {
  getNavGroupsForProduct,
  getProductFromPathname,
  flattenNavRoutes,
  isNavRouteActive,
  isModuleEnabled,
  MODULE_ACCENTS,
  type ModuleAccent,
} from "./sidebar/sidebar-nav-items";
import type { BuildSidebarSlotProps } from "./sidebar/build-sidebar-slot";
import { SidebarSection } from "./sidebar/sidebar-section";
import { ProductSwitcherMenu } from "./header/product-switcher-menu";
import { WorkspaceSwitcher } from "./header/org-switcher";

import { useAccess, useCan } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useEntitlements } from "@/hooks/api/entitlements";

interface AppSidebarProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
  onRequestProductSwitcher?: () => void;
  onRequestOrgSwitcher?: () => void;
  isMobile?: boolean;
  buildSidebarSlot?: (props: BuildSidebarSlotProps) => React.ReactNode;
}

interface SidebarSkeletonProps {
  isCollapsed: boolean;
  isMobile: boolean;
}

const noop = () => {};

function SidebarSkeleton({ isCollapsed, isMobile }: SidebarSkeletonProps) {
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full overflow-visible bg-sidebar text-sidebar-foreground",
        !isMobile &&
          "transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
        isMobile ? "w-full" : effectiveCollapsed ? "w-[3.5rem]" : "w-[17rem]",
      )}
    >
      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("py-2", effectiveCollapsed ? "px-1" : "px-2.5")}>
          <div className="space-y-px">
            {Array.from({ length: effectiveCollapsed ? 5 : 6 }).map((_, i) =>
              effectiveCollapsed ? (
                <Skeleton key={i} className="h-8 w-8 rounded-sm mx-auto" />
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-2.5 py-1.5"
                >
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-3.5 flex-1 max-w-[7rem] rounded" />
                </div>
              ),
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function AppSidebar({
  isCollapsed = false,
  onNavigate,
  onRequestProductSwitcher,
  onRequestOrgSwitcher,
  isMobile = false,
  buildSidebarSlot,
}: AppSidebarProps) {
  const { data: session, status } = useSession();
  const { data: access } = useAccess();
  const isOrgOwner = access?.isOrgOwner === true;
  const effectiveRole = isOrgOwner ? "OWNER" : "MEMBER";

  const pathname = usePathname();
  const activeProduct = getProductFromPathname(pathname);
  const accent: ModuleAccent = MODULE_ACCENTS[activeProduct];
  const isBuildProduct = activeProduct === "build";

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const scopes = access?.scopes;
  const canApproveLeaves = useCan("hr:leaves:approve");
  const canReadChat = useCan("chat:channels:read");
  const enabledModules = useEnabledModules();
  const isHrModuleEnabled = isModuleEnabled("hrms", enabledModules);
  const { data: entitlements } = useEntitlements();
  const lockedModules = entitlements?.lockedModules ?? [];

  const navGroups = useMemo(() => {
    if (isBuildProduct) return [];
    return getNavGroupsForProduct(
      activeProduct,
      effectiveRole,
      scopes,
      enabledModules,
      lockedModules,
    );
  }, [
    isBuildProduct,
    activeProduct,
    effectiveRole,
    scopes,
    enabledModules,
    lockedModules,
  ]);

  const activeGroupLabel = useMemo(() => {
    for (const group of navGroups) {
      const match = flattenNavRoutes(group.routes).some((route) =>
        isNavRouteActive(route, pathname),
      );
      if (match) return group.label;
    }
    return null;
  }, [navGroups, pathname]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups");
      if (stored)
        setCollapsedGroups(JSON.parse(stored) as Record<string, boolean>);
    } catch {}
  }, []);

  useEffect(() => {
    setCollapsedGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of navGroups) {
        if (group.defaultCollapsed && !(group.label in next)) {
          next[group.label] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [navGroups]);

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
    enabled: canApproveLeaves && isHrModuleEnabled && !!session?.user,
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
  const pendingLeaves = pendingApprovalsData?.pendingLeaves ?? 0;

  const isChatModuleEnabled = access?.modules?.chat !== false;
  const { data: chatUnread } = useChatUnreadTotal(
    isChatModuleEnabled && canReadChat,
  );
  const unreadChatCount = chatUnread?.total ?? 0;

  const { data: unifiedCountData } = useUnifiedInboxCount({
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
  const unreadInboxCount = unifiedCountData?.total ?? 0;

  useEffect(() => {
    const base = "StreamlineOS";
    const total = unreadChatCount + unreadInboxCount;
    document.title =
      total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [unreadChatCount, unreadInboxCount]);

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  if (status === "loading")
    return <SidebarSkeleton isCollapsed={isCollapsed} isMobile={isMobile} />;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex min-h-0 flex-col bg-sidebar text-sidebar-foreground",
          isMobile
            ? "h-full w-full flex-1 overflow-hidden"
            : "h-full overflow-visible",
          !isMobile &&
            "transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
          !isMobile && (effectiveCollapsed ? "w-[3.5rem]" : "w-[17rem]"),
        )}
      >
        {isMobile && (
          <div className="shrink-0 space-y-1 border-b border-sidebar-border px-2.5 py-2">
            <WorkspaceSwitcher
              variant="sidebar"
              triggerOnly
              onRequestOpen={onRequestOrgSwitcher}
            />
            <ProductSwitcherMenu
              variant="sidebar"
              triggerOnly
              onRequestOpen={onRequestProductSwitcher}
            />
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {isBuildProduct ? (
            <nav aria-label="Build navigation">
              {buildSidebarSlot?.({
                isCollapsed: effectiveCollapsed,
                onNavigate: onNavigate ?? noop,
              })}
            </nav>
          ) : (
            <nav className={cn("py-2", effectiveCollapsed ? "px-1" : "px-2.5")}>
              {navGroups.map((group, i) => {
                const multiGroup = navGroups.length > 1;
                return (
                  <SidebarSection
                    key={group.label}
                    group={group}
                    groupIndex={i}
                    isCollapsed={effectiveCollapsed}
                    showLabel={multiGroup}
                    isGroupCollapsed={
                      multiGroup
                        ? (collapsedGroups[group.label] ?? false)
                        : false
                    }
                    onToggleGroup={
                      multiGroup ? () => toggleGroup(group.label) : undefined
                    }
                    pendingLeaves={pendingLeaves}
                    onNavigate={onNavigate}
                    accent={accent}
                  />
                );
              })}
            </nav>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
