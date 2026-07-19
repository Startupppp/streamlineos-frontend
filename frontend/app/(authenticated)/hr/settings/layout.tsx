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
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden">
      <div className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur-sm">
        <nav
          className="flex items-center gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-hide px-2 sm:px-3 touch-pan-x"
          aria-label="HR Settings"
        >
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/hr/settings"
                ? pathname === "/hr/settings"
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                  isActive
                    ? "text-foreground"
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
