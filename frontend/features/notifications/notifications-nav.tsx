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
  { href: "/settings/notifications/my-preferences", label: "My preferences" },
];

const ADMIN_TABS: Array<NavTab & { permission: PermissionKey }> = [
  {
    href: "/settings/notifications/templates",
    label: "Templates",
    permission: "notifications:templates:view",
  },
  {
    href: "/settings/notifications/broadcasts",
    label: "Broadcasts",
    permission: "notifications:broadcasts:view",
  },
  {
    href: "/settings/notifications/providers",
    label: "Providers",
    permission: "notifications:providers:view",
  },
  {
    href: "/settings/notifications/events",
    label: "Events",
    permission: "notifications:events:view",
  },
  {
    href: "/settings/notifications/policy",
    label: "Policy",
    permission: "notifications:policy:view",
  },
];

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ tab, active }: { tab: NavTab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {tab.label}
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
      <div className="inline-flex h-9 w-full items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide sm:w-fit my-2">
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
