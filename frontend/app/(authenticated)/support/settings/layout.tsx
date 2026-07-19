"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Automations", href: "/support/settings/automations" },
  { label: "SLA Policies", href: "/support/settings/sla" },
  { label: "Business Hours", href: "/support/settings/business-hours" },
  { label: "Channels", href: "/support/settings/channels" },
  { label: "Custom Fields", href: "/support/settings/custom-fields" },
  { label: "Agents & VIPs", href: "/support/settings/agent-routing" },
  { label: "Audit Log", href: "/support/settings/audit-log" },
] as const;

export default function SupportSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-1">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Support Settings">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
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
