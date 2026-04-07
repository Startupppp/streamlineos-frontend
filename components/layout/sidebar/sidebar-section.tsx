"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div className={cn(groupIndex > 0 && "mt-3")}>
      {/* Section label — expanded only */}
      {!isCollapsed && (
        <div className="px-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/30 select-none">
            {group.label}
          </span>
        </div>
      )}

      {/* Visual divider between groups in collapsed mode */}
      {isCollapsed && groupIndex > 0 && (
        <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
      )}

      <div className="space-y-0.5">
        {group.routes.map((route) => {
          const isExactMatch = pathname === route.href;
          const isActive =
            isExactMatch ||
            (route.isProjectsList && pathname.startsWith("/projects/"));

          const chatBadge =
            route.href === "/chat" && unreadChatCount > 0 ? unreadChatCount : 0;
          const leavesBadge =
            route.badge === "leaves" && pendingLeaves > 0 ? pendingLeaves : 0;
          const hasBadge = chatBadge > 0 || leavesBadge > 0;
          const badgeCount = chatBadge || leavesBadge;

          const item = (
            <Link
              href={route.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "nav-item group relative",
                isCollapsed
                  ? "justify-center w-9 h-9 mx-auto flex"
                  : "px-2.5 py-1.5 gap-2.5 w-full flex",
                !isCollapsed && route.isSubItem && "pl-6",
                isActive && "active"
              )}
            >
              {/* Active indicator strip */}
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-gold" />
              )}

              {/* Icon */}
              <route.icon
                className={cn(
                  "nav-icon transition-colors duration-150",
                  route.isSubItem ? "h-3.5 w-3.5" : "h-4 w-4",
                  isActive && "text-gold"
                )}
              />

              {/* Label + badge — expanded only */}
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-[0.8125rem]">
                    {route.label}
                  </span>

                  {hasBadge && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums leading-none",
                        chatBadge > 0
                          ? "bg-red-500 text-white"
                          : "bg-amber-500 text-white"
                      )}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </>
              )}

              {/* Collapsed badge dot */}
              {isCollapsed && hasBadge && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-sidebar" />
              )}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={route.href} delayDuration={0}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
                  {route.label}
                  {hasBadge && (
                    <span className="ml-1.5 opacity-70">({badgeCount})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={route.href}>{item}</div>;
        })}
      </div>
    </div>
  );
}
