"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, startTransition } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  flattenNavRoutes,
  isNavRouteActive,
  type NavGroup,
  type NavRoute,
  type ModuleAccent,
} from "./sidebar-nav-items";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useNavIntentPrefetch } from "@/components/layout/nav-intent-prefetch";
import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";

function hoistSingletonParentRoutes(routes: NavRoute[]): NavRoute[] {
  if (routes.length !== 1) return routes;
  const [sole] = routes;
  const kids = sole.children;
  if (!kids?.length) return routes;
  return [{ ...sole, children: undefined }, ...kids];
}

function dedupeByHref(routes: NavRoute[]): NavRoute[] {
  const seen = new Set<string>();
  const result: NavRoute[] = [];
  for (const route of routes) {
    if (seen.has(route.href)) continue;
    seen.add(route.href);
    result.push(route);
  }
  return result;
}

interface SidebarSectionProps {
  group: NavGroup;
  groupIndex: number;
  isCollapsed: boolean;
  showLabel?: boolean;
  isGroupCollapsed?: boolean;
  onToggleGroup?: () => void;
  pendingLeaves: number;
  onNavigate?: () => void;
  accent: ModuleAccent;
}

function routeContainsActive(route: NavRoute, pathname: string): boolean {
  if (!route.children) return false;
  return route.children.some(
    (child) =>
      isNavRouteActive(child, pathname) ||
      routeContainsActive(child, pathname),
  );
}

export function SidebarSection({
  group,
  groupIndex,
  isCollapsed,
  showLabel,
  isGroupCollapsed,
  onToggleGroup,
  pendingLeaves,
  onNavigate,
  accent,
}: SidebarSectionProps) {
  const pathname = usePathname();
  const showItems = isCollapsed || !isGroupCollapsed;

  return (
    <div className={cn(groupIndex > 0 && "mt-2")}>
      {!isCollapsed && showLabel && (
        onToggleGroup ? (
          <button
            type="button"
            onClick={onToggleGroup}
            className="w-full flex items-center justify-between px-2 py-1 mb-0.5 group/header rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/65 select-none transition-colors">
              {group.label}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-sidebar-foreground/20 group-hover/header:text-sidebar-foreground/40 transition-all duration-200 shrink-0",
                isGroupCollapsed && "-rotate-90",
              )}
            />
          </button>
        ) : (
          <div className="px-2 pt-3 pb-1">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/65 select-none">
              {group.label}
            </span>
          </div>
        )
      )}

      {isCollapsed && groupIndex > 0 && (
        <div className="mx-auto my-1.5 h-px w-5 bg-sidebar-border" />
      )}

      {showItems && (
        <div className="space-y-px">
          {isCollapsed
            ? dedupeByHref(flattenNavRoutes(group.routes)).map((route) => (
                <CollapsedItem
                  key={route.href}
                  route={route}
                  pathname={pathname}
                  pendingLeaves={pendingLeaves}
                  onNavigate={onNavigate}
                  accent={accent}
                />
              ))
            : hoistSingletonParentRoutes(group.routes).map((route) => (
                <ExpandedItem
                  key={route.href}
                  route={route}
                  depth={0}
                  pathname={pathname}
                  pendingLeaves={pendingLeaves}
                  onNavigate={onNavigate}
                  accent={accent}
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
  onNavigate?: () => void;
  accent: ModuleAccent;
}

function computeBadge(route: NavRoute, pendingLeaves: number) {
  if (route.badge === "leaves" && pendingLeaves > 0) return pendingLeaves;
  return 0;
}

function CollapsedItem({ route, pathname, pendingLeaves, onNavigate, accent }: ItemProps) {
  const isActive = isNavRouteActive(route, pathname);
  const count = computeBadge(route, pendingLeaves);
  const hasBadge = count > 0;
  const prefetchOnIntent = useNavIntentPrefetch();
  const handleIntent = useCallback(
    () => prefetchOnIntent(route.href),
    [prefetchOnIntent, route.href],
  );

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={route.href}
          prefetch={false}
          onMouseEnter={handleIntent}
          onFocus={handleIntent}
          onTouchStart={handleIntent}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={cn("nav-item group relative justify-center w-8 h-8 mx-auto flex", isActive && "active")}
        >
          {isActive && (
            <span
              aria-hidden
              className={cn("absolute inset-0 rounded-sm pointer-events-none z-0", accent.bg)}
            />
          )}
          <route.icon
            className={cn(
              "nav-icon transition-colors duration-150 h-4 w-4 relative z-[1]",
              isActive && accent.text,
            )}
          />
          {hasBadge && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-danger-fill ring-1 ring-sidebar z-[2]" />
          )}
          <NavPendingIndicator className="z-[2]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="z-[9999] text-xs font-medium" style={{ zIndex: 9999 }}>
        {route.label}
        {hasBadge && <span className="ml-1.5 opacity-70">({count})</span>}
      </TooltipContent>
    </Tooltip>
  );
}

interface ExpandedItemProps extends ItemProps {
  depth: number;
}

function ExpandedItem({ route, depth, pathname, pendingLeaves, onNavigate, accent }: ExpandedItemProps) {
  const hasChildren = !!route.children && route.children.length > 1;
  const singleChild = !!route.children && route.children.length === 1;
  const containsActive = (hasChildren || singleChild) && routeContainsActive(route, pathname);
  const isActive = isNavRouteActive(route, pathname) && !containsActive;
  const [expanded, setExpanded] = useState<boolean>(isActive || containsActive);

  useEffect(() => {
    if (containsActive || isActive) startTransition(() => setExpanded(true));
  }, [containsActive, isActive]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const count = computeBadge(route, pendingLeaves);
  const hasBadge = count > 0;
  const paddingLeft = depth === 0 ? "0.625rem" : `${0.625 + depth * 0.75}rem`;
  const prefetchOnIntent = useNavIntentPrefetch();
  const handleIntent = useCallback(
    () => prefetchOnIntent(route.href),
    [prefetchOnIntent, route.href],
  );

  return (
    <div>
      <Link
        href={route.href}
        prefetch={false}
        onMouseEnter={handleIntent}
        onFocus={handleIntent}
        onTouchStart={handleIntent}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "nav-item group relative py-1.5 gap-2.5 flex pr-2",
          depth === 0 ? "w-full" : "mx-2",
          isActive && "active",
        )}
        style={{ paddingLeft }}
      >
        {isActive && (
          <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full", accent.indicator)} />
        )}
        <route.icon
          className={cn(
            "nav-icon transition-colors duration-150 shrink-0",
            depth > 0 ? "h-3.5 w-3.5" : "h-4 w-4",
            isActive && accent.text,
          )}
        />
        <TruncatedText text={route.label} className={cn("flex-1 text-label", isActive && "text-sidebar-foreground")} />
        {hasBadge && (
          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-micro font-bold tabular-nums leading-none bg-status-warning-fill text-white">
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
        <NavPendingIndicator />
      </Link>

      {(hasChildren && expanded || singleChild) && (
        <div className="mt-0.5 space-y-0.5">
          {route.children!.map((child) => (
            <ExpandedItem
              key={child.href}
              route={child}
              depth={depth + 1}
              pathname={pathname}
              pendingLeaves={pendingLeaves}
              onNavigate={onNavigate}
              accent={accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
