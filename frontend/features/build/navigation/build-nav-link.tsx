"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useNavIntentPrefetch } from "@/components/layout/nav-intent-prefetch";
import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";

export const BUILD_NAV_BADGE_CAP = 99;

function badgePendingLabel(count: number): string {
  if (count > BUILD_NAV_BADGE_CAP) return `more than ${BUILD_NAV_BADGE_CAP} pending`;
  return `${count} pending`;
}

interface BuildNavLinkProps {
  destination: BuildNavDestination;
  isActive: boolean;
  isCollapsed: boolean;
  accent: ModuleAccent;
  badgeCount?: number;
  indent?: boolean;
  onNavigate?: () => void;
}

export function BuildNavLink({
  destination,
  isActive,
  isCollapsed,
  accent,
  badgeCount = 0,
  indent = false,
  onNavigate,
}: BuildNavLinkProps) {
  const prefetchOnIntent = useNavIntentPrefetch();
  const requestLeave = useNavigationLeave();
  const router = useRouter();
  const Icon = destination.icon;
  const hasBadge = badgeCount > 0;

  const handleIntent = useCallback(
    () => prefetchOnIntent(destination.href),
    [prefetchOnIntent, destination.href],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (event.button !== 0) return;
      event.preventDefault();
      requestLeave(() => {
        onNavigate?.();
        router.push(destination.href);
      });
    },
    [requestLeave, onNavigate, router, destination.href],
  );

  const link = (
    <Link
      href={destination.href}
      prefetch={false}
      onMouseEnter={handleIntent}
      onFocus={handleIntent}
      onTouchStart={handleIntent}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      aria-label={
        isCollapsed
          ? hasBadge
            ? `${destination.label}, ${badgePendingLabel(badgeCount)}`
            : destination.label
          : undefined
      }
      className={cn(
        "nav-item group relative flex gap-2.5",
        isCollapsed
          ? "mx-auto h-8 w-8 justify-center"
          : indent
            ? "py-1.5 pl-5 pr-2"
            : "py-1.5 pl-2.5 pr-2",
        isActive && "active",
      )}
    >
      {isActive && isCollapsed ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-0 rounded-sm",
            accent.bg,
          )}
        />
      ) : null}
      {isActive && !isCollapsed ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full",
            accent.indicator,
          )}
        />
      ) : null}
      <Icon
        className={cn(
          "nav-icon relative z-[1] h-4 w-4 shrink-0",
          isActive && accent.text,
        )}
      />
      {isCollapsed ? null : (
        <TruncatedText
          text={destination.label}
          className={cn("flex-1 text-label", isActive && "text-sidebar-foreground")}
        />
      )}
      {isCollapsed && hasBadge ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 z-[2] h-2 w-2 rounded-full bg-status-danger-fill ring-1 ring-sidebar"
        />
      ) : null}
      {!isCollapsed && hasBadge ? (
        <>
          <span
            aria-hidden
            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-danger-fill px-1 text-micro font-bold leading-none tabular-nums text-white"
          >
            {badgeCount > BUILD_NAV_BADGE_CAP
              ? `${BUILD_NAV_BADGE_CAP}+`
              : badgeCount}
          </span>
          <span className="sr-only">{`, ${badgePendingLabel(badgeCount)}`}</span>
        </>
      ) : null}
      <NavPendingIndicator className="z-[2]" />
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {destination.label}
        {hasBadge ? (
          <span className="ml-1.5 opacity-70">({badgeCount})</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
