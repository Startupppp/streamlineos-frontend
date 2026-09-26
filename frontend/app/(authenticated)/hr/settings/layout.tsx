"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
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
  "hr:reporting-lines:override",
];

const TABS: {
  label: string;
  href: string;
  permission: PermissionKey | PermissionKey[];
  advanced?: boolean;
}[] = [
  { label: "Overview", href: "/hr/settings", permission: SETTINGS_OVERVIEW_PERMISSIONS },
  { label: "Policies", href: "/hr/settings/policies", permission: "hr:policies:view" },
  { label: "Reporting managers", href: "/hr/settings/reporting-managers", permission: "hr:reporting-lines:manage" },
  { label: "Workflows", href: "/hr/settings/workflows", permission: "hr:workflows:view", advanced: true },
  { label: "Automations", href: "/hr/settings/automations", permission: "hr:automations:view", advanced: true },
  { label: "Templates", href: "/hr/settings/templates", permission: "hr:templates:view" },
  { label: "Forms", href: "/hr/settings/forms", permission: "hr:forms:view", advanced: true },
  { label: "Custom fields", href: "/hr/settings/custom-fields", permission: "hr:custom-fields:manage", advanced: true },
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
  const router = useRouter();
  const [isAdvanced] = useHrSettingsMode();
  const { data: access } = useAccess();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

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

  const activeTab = visibleTabs.find((tab) => isTabActive(tab.href, pathname));

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [pathname]);

  function handleSectionSelect(href: string) {
    router.push(href);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 pt-3 pb-0">
        <Select value={activeTab?.href ?? ""} onValueChange={handleSectionSelect}>
          <SelectTrigger className="w-full md:hidden" aria-label="HR configuration section">
            <SelectValue placeholder="Choose a section" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {visibleTabs.map((tab) => (
              <SelectItem key={tab.href} value={tab.href}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <nav
          className="hidden h-9 w-fit items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide md:inline-flex"
          aria-label="HR configuration"
        >
          {visibleTabs.map((tab) => {
            const isActive = isTabActive(tab.href, pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={isActive ? activeTabRef : null}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
