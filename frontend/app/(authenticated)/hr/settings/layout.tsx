"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHrSettingsMode } from "@/features/hr/settings-hub/use-hr-settings-mode";
import { useAccess } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

const SETTINGS_OVERVIEW_PERMISSIONS: PermissionKey[] = [
  "settings:organization:manage",
  "settings:rbac:manage",
  "notifications:providers:view",
  "settings:webhooks:manage",
  "hr:import:manage",
  "hr:export:manage",
  "hr:integrations:manage",
  "hr:policies:view",
  "hr:policies:manage",
  "hr:workflows:view",
  "hr:templates:view",
  "hr:forms:view",
  "hr:custom-fields:manage",
  "hr:automations:view",
];

const TABS: {
  label: string;
  href: string;
  permission: PermissionKey | PermissionKey[];
  advanced?: boolean;
}[] = [
  { label: "Overview", href: "/hr/settings", permission: SETTINGS_OVERVIEW_PERMISSIONS },
  { label: "Company", href: "/hr/settings/company", permission: "settings:organization:manage" },
  { label: "Policies", href: "/hr/settings/policies", permission: "hr:policies:view" },
  { label: "Workflows", href: "/hr/settings/workflows", permission: "hr:workflows:view", advanced: true },
  { label: "Automations", href: "/hr/settings/automations", permission: "hr:automations:view", advanced: true },
  { label: "Templates", href: "/hr/settings/templates", permission: "hr:templates:view" },
  { label: "Forms", href: "/hr/settings/forms", permission: "hr:forms:view", advanced: true },
  { label: "Custom Fields", href: "/hr/settings/custom-fields", permission: "hr:custom-fields:manage", advanced: true },
  { label: "Import / Export", href: "/hr/settings/import-export", permission: ["hr:import:manage", "hr:export:manage"] },
  { label: "Integrations", href: "/hr/settings/integrations", permission: "hr:integrations:manage", advanced: true },
  { label: "Preview", href: "/hr/settings/preview", permission: "hr:policies:view", advanced: true },
  { label: "Versions", href: "/hr/settings/versions", permission: "hr:policies:view", advanced: true },
];

function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === "/hr/settings") return pathname === "/hr/settings";
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

export default function HrSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAdvanced] = useHrSettingsMode();
  const { data: access } = useAccess();
  const canOpen = (tab: (typeof TABS)[number]) => {
    if (access?.isOrgOwner) return true;
    const required = Array.isArray(tab.permission)
      ? tab.permission
      : [tab.permission];
    return required.some((permission) =>
      access ? permission in access.scopes : false,
    );
  };
  const visibleTabs = TABS.filter(
    (tab) =>
      canOpen(tab) &&
      (isAdvanced || !tab.advanced || isTabActive(tab.href, pathname)),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 pt-3 pb-0">
        <nav
          className="inline-flex h-9 w-full items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide sm:w-fit"
          aria-label="HR Settings"
        >
          {visibleTabs.map((tab) => {
            const isActive = isTabActive(tab.href, pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 sm:left-0 sm:right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
