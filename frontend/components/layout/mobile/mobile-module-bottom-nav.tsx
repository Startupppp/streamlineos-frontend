"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useProductSidebarVisibility } from "../sidebar/use-product-sidebar-visibility";
import {
  getMobileModuleBottomTabs,
  getMobileModuleOverflowTabs,
  getMobileGroupTabs,
  getOverflowTabsByGroup,
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
  usesMobileGroupTabs,
} from "./mobile-module-nav-items";
import { getProductFromPathname, type NavRoute } from "../sidebar/sidebar-nav-items";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { useNavIntentPrefetch } from "@/components/layout/nav-intent-prefetch";
import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";

const NAV_PILL_SPRING = { type: "spring", stiffness: 500, damping: 34 } as const;

function NavSelectionPill({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion() === true;
  if (!active) return null;
  return (
    <motion.span
      layoutId="mobile-module-nav-selection"
      aria-hidden
      className="absolute inset-0 rounded-md bg-card shadow-xs"
      transition={reduceMotion ? { duration: 0 } : NAV_PILL_SPRING}
    />
  );
}

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
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded-md px-0.5 text-center active:scale-[0.97]",
        "transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={route.label}
    >
      <NavSelectionPill active={isActive} />
      <Icon
        className={cn(
          "relative z-10 size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
          isActive && "scale-110",
        )}
      />
      <span className="relative z-10 max-w-full px-0.5 text-center text-micro leading-none">
        {route.label}
      </span>
      <NavPendingIndicator className="z-10" />
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
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded-md px-0.5 text-center active:scale-[0.97]",
        "transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="More navigation options"
      aria-expanded={isOpen}
    >
      <NavSelectionPill active={isActive} />
      <EllipsisIcon
        ref={iconRef}
        className={cn(
          "relative z-10 size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
          isActive && "scale-110",
        )}
      />
      <span className="relative z-10 max-w-full px-0.5 text-center text-micro leading-none">
        More
      </span>
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
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none",
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
      <DrawerContent className="gap-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] motion-reduce:transition-none">
        <DrawerTitle className="sr-only">More navigation options</DrawerTitle>
        <DrawerDescription className="sr-only">
          The sections of this module that did not fit in the bottom bar.
          Choosing one navigates there and closes this sheet.
        </DrawerDescription>
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
  const groupTabs = usesMobileGroupTabs(getProductFromPathname(pathname), navGroups)
    ? getMobileGroupTabs(navGroups, pathname)
    : null;
  const tabs = getMobileModuleBottomTabs(navGroups);
  const overflowTabs = groupTabs ? [] : getMobileModuleOverflowTabs(navGroups);
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
          "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden",
          className,
        )}
        aria-label="Module navigation"
      >
        <div className="flex h-11 w-full items-stretch gap-0.5 bg-muted px-1">
          {groupTabs
            ? groupTabs.map((tab) => (
                <ModuleNavLink key={tab.route.label} route={tab.route} isActive={tab.isActive} />
              ))
            : tabs.map((route) => (
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
