"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHrSettingsMode } from "@/features/hr/settings-hub/use-hr-settings-mode";

const TABS: { label: string; href: string; advanced?: boolean }[] = [
  { label: "Overview", href: "/hr/settings" },
  { label: "Policies", href: "/hr/settings/policies" },
  { label: "Workflows", href: "/hr/settings/workflows", advanced: true },
  { label: "Automations", href: "/hr/settings/automations", advanced: true },
  { label: "Templates", href: "/hr/settings/templates" },
  { label: "Forms", href: "/hr/settings/forms", advanced: true },
  { label: "Custom Fields", href: "/hr/settings/custom-fields", advanced: true },
  { label: "Import / Export", href: "/hr/settings/import-export" },
  { label: "Integrations", href: "/hr/settings/integrations", advanced: true },
  { label: "Preview", href: "/hr/settings/preview", advanced: true },
  { label: "Versions", href: "/hr/settings/versions", advanced: true },
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
  const visibleTabs = TABS.filter(
    (tab) => isAdvanced || !tab.advanced || isTabActive(tab.href, pathname),
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
