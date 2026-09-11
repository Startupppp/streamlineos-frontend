"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useProductSidebarVisibility } from "../sidebar/use-product-sidebar-visibility";
import {
  getMobileModuleBottomTabs,
  getMobileModuleOverflowTabs,
  getOverflowTabsByGroup,
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
} from "./mobile-module-nav-items";
import type { NavRoute } from "../sidebar/sidebar-nav-items";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useNavIntentPrefetch } from "@/components/layout/nav-intent-prefetch";
import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";

function ModuleNavLink({
  route,
  isActive,
}: {
  route: NavRoute;
  isActive: boolean;
}) {
  const Icon = route.icon;

  return (
    <Link
      href={route.href}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={route.label}
    >
      <Icon className="size-5 shrink-0" />
      <TruncatedText
        text={route.label}
        className="max-w-full truncate text-center text-micro leading-none"
      />
      <NavPendingIndicator />
    </Link>
  );
}

function MoreTab({
  onOpen,
  isActive,
  isOpen,
}: {
  onOpen: () => void;
  isActive: boolean;
  isOpen: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <button
      type="button"
      onClick={onOpen}
      {...hoverHandlers}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="More navigation options"
      aria-expanded={isOpen}
    >
      <EllipsisIcon ref={iconRef} className="size-5 shrink-0" />
      <TruncatedText
        text="More"
        className="max-w-full truncate text-center text-micro leading-none"
      />
    </button>
  );
}

function OverflowNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: NavRoute["icon"];
  isActive: boolean;
  onNavigate: () => void;
}) {
  const prefetchOnIntent = useNavIntentPrefetch();
  const handleIntent = useCallback(
    () => prefetchOnIntent(href),
    [prefetchOnIntent, href],
  );

  return (
    <Link
      href={href}
      prefetch={false}
      onTouchStart={handleIntent}
      onMouseEnter={handleIntent}
      onFocus={handleIntent}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {label}
      <NavPendingIndicator />
    </Link>
  );
}

function MoreDrawer({
  open,
  onOpenChange,
  groups,
  allOverflowRoutes,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { label: string; routes: NavRoute[] }[];
  allOverflowRoutes: NavRoute[];
  pathname: string;
}) {
  const showGroupLabels = groups.length > 1;

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal>
      <DrawerContent className="gap-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <DrawerTitle className="sr-only">More navigation options</DrawerTitle>
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {groups.map((group) => (
            <div key={group.label}>
              {showGroupLabels && (
                <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.routes.map((route) => {
                const Icon = route.icon;
                const isActive = isMobileNavRouteActive(
                  pathname,
                  route,
                  allOverflowRoutes,
                );
                return (
                  <OverflowNavLink
                    key={route.href}
                    href={route.href}
                    label={route.label}
                    icon={Icon}
                    isActive={isActive}
                    onNavigate={handleClose}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function MobileModuleBottomNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const { navGroups } = useProductSidebarVisibility();
  const [moreOpen, setMoreOpen] = useState(false);

  const isChatRoute = pathname.startsWith("/chat");
  const show = shouldShowMobileModuleBottomNav(navGroups, { isChatRoute });
  const tabs = getMobileModuleBottomTabs(navGroups);
  const overflowTabs = getMobileModuleOverflowTabs(navGroups);
  const overflowGroups = getOverflowTabsByGroup(navGroups);
  const hasOverflow = overflowTabs.length > 0;
  const moreTabActive =
    hasOverflow &&
    overflowTabs.some((r) => isMobileNavRouteActive(pathname, r, overflowTabs));

  function openMoreDrawer() {
    setMoreOpen(true);
  }

  if (!show) return null;

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden",
          className,
        )}
        aria-label="Module navigation"
      >
        <div className="flex h-16 w-full items-stretch">
          {tabs.map((route) => (
            <ModuleNavLink
              key={route.href}
              route={route}
              isActive={isMobileNavRouteActive(pathname, route, tabs)}
            />
          ))}
          {hasOverflow && (
            <MoreTab
              onOpen={openMoreDrawer}
              isActive={moreTabActive}
              isOpen={moreOpen}
            />
          )}
        </div>
      </nav>

      {hasOverflow && (
        <MoreDrawer
          open={moreOpen}
          onOpenChange={setMoreOpen}
          groups={overflowGroups}
          allOverflowRoutes={overflowTabs}
          pathname={pathname}
        />
      )}
    </>
  );
}
