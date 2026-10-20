"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, startTransition, type MouseEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { useNavIntentPrefetch } from "@/components/layout/nav-intent-prefetch";
import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";
import { NavLockBadge } from "@/components/layout/nav-lock-badge";
import {
  isNavRouteActive,
  type ModuleAccent,
  type NavRoute,
} from "./sidebar-nav-items";

const BILLING_UPGRADE_HREF = "/settings/billing";
const DEPTH_PADDING = ["pl-2", "pl-12", "pl-16"] as const;

interface HrSidebarItemProps {
  route: NavRoute;
  pathname: string;
  pendingLeaves: number;
  inboxCount: number;
  onNavigate?: () => void;
  accent: ModuleAccent;
  depth: number;
  forceExpanded: boolean;
  iconsOnly?: boolean;
}

function routeContainsActive(route: NavRoute, pathname: string): boolean {
  if (!route.children?.length) return false;
  return route.children.some(
    (child) => isNavRouteActive(child, pathname) || routeContainsActive(child, pathname),
  );
}

function computeBadge(
  route: NavRoute,
  pendingLeaves: number,
  inboxCount: number,
): { count: number; variant: "leaves" | "inbox" } {
  if (route.badge === "leaves" && pendingLeaves > 0) {
    return { count: pendingLeaves, variant: "leaves" };
  }
  if (route.badge === "inbox" && inboxCount > 0) {
    return { count: inboxCount, variant: "inbox" };
  }
  return { count: 0, variant: "leaves" };
}

export function HrSidebarItem({
  route,
  pathname,
  pendingLeaves,
  inboxCount,
  onNavigate,
  accent,
  depth,
  forceExpanded,
  iconsOnly = false,
}: HrSidebarItemProps) {
  const hasChildren = !!route.children && route.children.length > 1;
  const singleChild = !!route.children && route.children.length === 1;
  const containsActive = (hasChildren || singleChild) && routeContainsActive(route, pathname);
  const isActive =
    !route.locked &&
    (iconsOnly
      ? isNavRouteActive(route, pathname) || containsActive
      : isNavRouteActive(route, pathname) && !containsActive);
  const [expanded, setExpanded] = useState(isActive || containsActive);

  useEffect(() => {
    if (containsActive || isActive) startTransition(() => setExpanded(true));
  }, [containsActive, isActive]);

  const toggle = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (forceExpanded) return;
    setExpanded((value) => !value);
  }, [forceExpanded]);

  const badge = computeBadge(route, pendingLeaves, inboxCount);
  const hasBadge = badge.count > 0 && !route.locked;
  const displayBadge = badge.count > 99 ? "99+" : badge.count;
  const href = route.locked ? BILLING_UPGRADE_HREF : route.href;
  const prefetchOnIntent = useNavIntentPrefetch();
  const handleIntent = useCallback(() => prefetchOnIntent(href), [prefetchOnIntent, href]);
  const showChildren = !iconsOnly && ((hasChildren && (forceExpanded || expanded)) || singleChild);

  if (iconsOnly) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={href}
            prefetch={false}
            onMouseEnter={handleIntent}
            onFocus={handleIntent}
            onTouchStart={handleIntent}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            aria-label={route.locked ? `${route.label}, upgrade plan` : route.label}
            className={cn(
              "nav-item group relative mx-auto flex h-8 w-8 justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              isActive && "active",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className={cn("pointer-events-none absolute inset-0 rounded-md", accent.bg)}
              />
            )}
            <route.icon
              className={cn(
                "nav-icon relative z-[1] h-4 w-4",
                isActive && accent.text,
                route.locked && "opacity-50",
              )}
            />
            {hasBadge && badge.variant === "inbox" && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 z-[2] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-micro font-bold tabular-nums leading-none text-primary-foreground ring-1 ring-sidebar"
              >
                {displayBadge}
              </span>
            )}
            {hasBadge && badge.variant === "leaves" && (
              <span className="absolute -top-0.5 -right-0.5 z-[2] h-2 w-2 rounded-full bg-status-danger-fill ring-1 ring-sidebar" />
            )}
            <NavPendingIndicator className="z-[2]" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {route.label}
          {hasBadge && <span className="ml-1.5 opacity-70">({badge.count})</span>}
          {route.locked && <span className="ml-1.5 opacity-70">(Upgrade)</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  const padding = DEPTH_PADDING[Math.min(depth, DEPTH_PADDING.length - 1)];

  return (
    <div>
      <div
        className={cn(
          "nav-item group/row relative min-h-8 w-full gap-0.5 py-0 pr-1",
          padding,
          isActive && "active",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 rounded-md", accent.bg)}
          />
        )}
        <Link
          href={href}
          prefetch={false}
          onMouseEnter={handleIntent}
          onFocus={handleIntent}
          onTouchStart={handleIntent}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          aria-label={route.locked ? `${route.label}, upgrade plan` : undefined}
          className="relative z-[1] flex min-h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          {depth === 0 && (
            <route.icon
              className={cn(
                "nav-icon h-4 w-4 shrink-0",
                isActive && accent.text,
                route.locked && "opacity-50",
              )}
            />
          )}
          <TruncatedText
            text={route.label}
            className={cn("min-w-0 flex-1 text-label", route.locked && "opacity-50")}
          />
          {route.locked && <NavLockBadge label="Upgrade" />}
          {hasBadge && (
            <span
              role="img"
              aria-label={`${displayBadge} unread`}
              className={cn(
                "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold tabular-nums leading-none",
                badge.variant === "inbox"
                  ? "bg-primary text-primary-foreground"
                  : "bg-status-warning-fill text-white",
              )}
            >
              <span aria-hidden="true">{displayBadge}</span>
            </span>
          )}
          <NavPendingIndicator />
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={toggle}
            aria-label={expanded ? `Collapse ${route.label}` : `Expand ${route.label}`}
            aria-expanded={forceExpanded || expanded}
            className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
                (forceExpanded || expanded) && "rotate-90",
              )}
            />
          </button>
        )}
      </div>
      {showChildren && route.children && (
        <div className="mt-0.5 space-y-0.5">
          {route.children.map((child) => (
            <HrSidebarItem
              key={child.href}
              route={child}
              pathname={pathname}
              pendingLeaves={pendingLeaves}
              inboxCount={inboxCount}
              onNavigate={onNavigate}
              accent={accent}
              depth={depth + 1}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
