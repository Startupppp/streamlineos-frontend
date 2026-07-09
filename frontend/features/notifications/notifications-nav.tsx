"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

interface NavTab {
  href: string;
  label: string;
}

const PERSONAL_TABS: NavTab[] = [
  { href: "/notifications", label: "Inbox" },
  { href: "/notifications/preferences", label: "Preferences" },
];

const ADMIN_TABS: Array<NavTab & { permission: PermissionKey }> = [
  {
    href: "/notifications/templates",
    label: "Templates",
    permission: "notifications:templates:view",
  },
  {
    href: "/notifications/broadcasts",
    label: "Broadcasts",
    permission: "notifications:broadcasts:view",
  },
  {
    href: "/notifications/providers",
    label: "Providers",
    permission: "notifications:providers:view",
  },
  {
    href: "/notifications/events",
    label: "Events",
    permission: "notifications:events:view",
  },
  {
    href: "/notifications/policy",
    label: "Policy",
    permission: "notifications:policy:view",
  },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/notifications") return pathname === "/notifications";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ tab, active }: { tab: NavTab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {tab.label}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

export function NotificationsNav() {
  const pathname = usePathname();

  const canByPermission: Partial<Record<PermissionKey, boolean>> = {
    "notifications:templates:view": useCan("notifications:templates:view"),
    "notifications:broadcasts:view": useCan("notifications:broadcasts:view"),
    "notifications:providers:view": useCan("notifications:providers:view"),
    "notifications:events:view": useCan("notifications:events:view"),
    "notifications:policy:view": useCan("notifications:policy:view"),
  };

  const visibleAdmin = ADMIN_TABS.filter(
    (tab) => canByPermission[tab.permission] === true,
  );

  return (
    <nav className="shrink-0 border-b border-border bg-background px-2 sm:px-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {PERSONAL_TABS.map((tab) => (
          <NavLink
            key={tab.href}
            tab={tab}
            active={isTabActive(pathname, tab.href)}
          />
        ))}
        {visibleAdmin.length > 0 && (
          <span className="mx-1 h-4 w-px shrink-0 bg-border" />
        )}
        {visibleAdmin.map((tab) => (
          <NavLink
            key={tab.href}
            tab={tab}
            active={isTabActive(pathname, tab.href)}
          />
        ))}
      </div>
    </nav>
  );
}
