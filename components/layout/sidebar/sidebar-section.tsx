"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { flattenNavRoutes, type NavGroup, type NavRoute } from "./sidebar-nav-items";

interface SidebarSectionProps {
  group: NavGroup;
  groupIndex: number;
  isCollapsed: boolean;
  isGroupCollapsed: boolean;
  onToggleGroup: () => void;
  pendingLeaves: number;
  unreadChatCount: number;
  onNavigate?: () => void;
}

function resolveGroupRoutes(routes: NavRoute[]): NavRoute[] {
  if (routes.length === 1 && routes[0].children && routes[0].children.length > 0) {
    return routes[0].children;
  }
  return routes;
}

function routeIsActive(route: NavRoute, pathname: string): boolean {
  if (pathname === route.href) return true;
  if (route.isProjectsList && pathname.startsWith("/projects/")) return true;
  return false;
}

function routeContainsActive(route: NavRoute, pathname: string): boolean {
  if (routeIsActive(route, pathname)) return true;
  if (!route.children) return false;
  return route.children.some((c) => routeContainsActive(c, pathname));
}

export function SidebarSection({
  group,
  groupIndex,
  isCollapsed,
  isGroupCollapsed,
  onToggleGroup,
  pendingLeaves,
  unreadChatCount,
  onNavigate,
}: SidebarSectionProps) {
  const pathname = usePathname();
  const showItems = isCollapsed || !isGroupCollapsed;

  return (
    <div className={cn(groupIndex > 0 && "mt-2")}>
      {!isCollapsed && (
        <button
          type="button"
          onClick={onToggleGroup}
          className="w-full flex items-center justify-between px-2 py-1 mb-0.5 group/header rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground group-hover/header:text-sidebar-foreground select-none transition-colors">
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-sidebar-foreground/20 group-hover/header:text-sidebar-foreground/40 transition-all duration-200 shrink-0",
              isGroupCollapsed && "-rotate-90",
            )}
          />
        </button>
      )}

      {isCollapsed && groupIndex > 0 && (
        <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
      )}

      {showItems && (
        <div className="space-y-0.5">
          {isCollapsed
            ? flattenNavRoutes(group.routes).map((route) => (
                <CollapsedItem
                  key={route.href}
                  route={route}
                  pathname={pathname}
                  pendingLeaves={pendingLeaves}
                  unreadChatCount={unreadChatCount}
                  onNavigate={onNavigate}
                />
              ))
            : (resolveGroupRoutes(group.routes)).map((route) => (
                <ExpandedItem
                  key={route.href}
                  route={route}
                  depth={0}
                  pathname={pathname}
                  pendingLeaves={pendingLeaves}
                  unreadChatCount={unreadChatCount}
                  onNavigate={onNavigate}
                />
              ))}
        </div>
      )}
    </div>
  );
}

interface ItemProps {
  route: NavRoute;
  pathname: string;
  pendingLeaves: number;
  unreadChatCount: number;
  onNavigate?: () => void;
}

function computeBadge(route: NavRoute, pendingLeaves: number, unreadChatCount: number) {
  const chatBadge = route.href === "/chat" && unreadChatCount > 0 ? unreadChatCount : 0;
  const leavesBadge = route.badge === "leaves" && pendingLeaves > 0 ? pendingLeaves : 0;
  const count = chatBadge || leavesBadge;
  return { count, isChat: chatBadge > 0 };
}

function CollapsedItem({ route, pathname, pendingLeaves, unreadChatCount, onNavigate }: ItemProps) {
  const isActive = routeIsActive(route, pathname);
  const { count, isChat } = computeBadge(route, pendingLeaves, unreadChatCount);
  const hasBadge = count > 0;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={route.href}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={cn("nav-item group relative justify-center w-9 h-9 mx-auto flex", isActive && "active")}
        >
          <route.icon className={cn("nav-icon transition-colors duration-150 h-4 w-4", isActive && "text-blue-600")} />
          {hasBadge && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-sidebar" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {route.label}
        {hasBadge && <span className="ml-1.5 opacity-70">({isChat && count > 99 ? "99+" : count})</span>}
      </TooltipContent>
    </Tooltip>
  );
}

interface ExpandedItemProps extends ItemProps {
  depth: number;
}

function ExpandedItem({ route, depth, pathname, pendingLeaves, unreadChatCount, onNavigate }: ExpandedItemProps) {
  const isActive = routeIsActive(route, pathname);
  const hasChildren = !!route.children && route.children.length > 0;
  const containsActive = hasChildren && routeContainsActive(route, pathname);
  const [expanded, setExpanded] = useState<boolean>(isActive || containsActive);

  useEffect(() => {
    if (containsActive || isActive) setExpanded(true);
  }, [containsActive, isActive]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const { count, isChat } = computeBadge(route, pendingLeaves, unreadChatCount);
  const hasBadge = count > 0;
  const paddingLeft = depth === 0 ? "0.625rem" : `${0.625 + depth * 0.75}rem`;

  return (
    <div>
      <Link
        href={route.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "nav-item group relative py-1.5 gap-2.5 w-full flex pr-2",
          isActive && "active",
        )}
        style={{ paddingLeft }}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-blue-500" />
        )}
        <route.icon
          className={cn(
            "nav-icon transition-colors duration-150 shrink-0",
            depth > 0 ? "h-3.5 w-3.5" : "h-4 w-4",
            isActive && "text-blue-600",
          )}
        />
        <span className="flex-1 truncate text-[0.8125rem]">{route.label}</span>
        {hasBadge && (
          <span
            className={cn(
              "inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums leading-none",
              isChat ? "bg-red-500 text-white" : "bg-amber-500 text-white",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={toggle}
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
            className="ml-auto -mr-1 h-5 w-5 flex items-center justify-center rounded text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform duration-150", expanded && "rotate-90")}
            />
          </button>
        )}
      </Link>

      {hasChildren && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {route.children!.map((child) => (
            <ExpandedItem
              key={child.href}
              route={child}
              depth={depth + 1}
              pathname={pathname}
              pendingLeaves={pendingLeaves}
              unreadChatCount={unreadChatCount}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
