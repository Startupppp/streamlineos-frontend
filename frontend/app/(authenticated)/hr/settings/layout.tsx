"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/hr/settings" },
  { label: "Policies", href: "/hr/settings/policies" },
  { label: "Workflows", href: "/hr/settings/workflows" },
  { label: "Automations", href: "/hr/settings/automations" },
  { label: "Templates", href: "/hr/settings/templates" },
  { label: "Forms", href: "/hr/settings/forms" },
  { label: "Custom Fields", href: "/hr/settings/custom-fields" },
  { label: "Import / Export", href: "/hr/settings/import-export" },
  { label: "Integrations", href: "/hr/settings/integrations" },
  { label: "Preview", href: "/hr/settings/preview" },
  { label: "Versions", href: "/hr/settings/versions" },
] as const;

export default function HrSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-1">
        <nav className="flex flex-wrap items-center gap-1" aria-label="HR Settings">
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/hr/settings"
                ? pathname === "/hr/settings"
                : pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
