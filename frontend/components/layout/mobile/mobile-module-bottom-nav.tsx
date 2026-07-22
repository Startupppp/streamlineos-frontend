"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProductSidebarVisibility } from "../sidebar/use-product-sidebar-visibility";
import {
  getMobileModuleBottomTabs,
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
} from "./mobile-module-nav-items";
import type { NavRoute } from "../sidebar/sidebar-nav-items";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

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
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors",
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
        className="max-w-full truncate text-center text-[10px] leading-none"
      />
    </Link>
  );
}

export function MobileModuleBottomNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const { navGroups } = useProductSidebarVisibility();
  const isChatRoute = pathname.startsWith("/chat");
  const show = shouldShowMobileModuleBottomNav(navGroups, { isChatRoute });
  const tabs = getMobileModuleBottomTabs(navGroups);

  if (!show) return null;

  return (
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
      </div>
    </nav>
  );
}
