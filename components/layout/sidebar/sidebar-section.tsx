"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./sidebar-nav-items";

interface SidebarSectionProps {
  group: NavGroup;
  groupIndex: number;
  isCollapsed: boolean;
  pendingLeaves: number;
  unreadChatCount: number;
  onNavigate?: () => void;
}

export function SidebarSection({
  group,
  groupIndex,
  isCollapsed,
  pendingLeaves,
  unreadChatCount,
  onNavigate,
}: SidebarSectionProps) {
  const pathname = usePathname();

  return (
    <div className={cn(groupIndex > 0 && "mt-6")}>
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
          const showBadge = route.badge === "leaves" && pendingLeaves > 0;
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
                <route.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isProjectActive || isExactMatch
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60"
                  )}
                />
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
              <route.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"
                )}
              />
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
  );
}
