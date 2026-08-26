"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Pipelines", href: "/crm/settings/pipelines" },
  { label: "Options", href: "/crm/settings/options" },
  { label: "Validation Rules", href: "/crm/settings/validation-rules" },
  { label: "Data Quality", href: "/crm/settings/data-quality" },
  { label: "Blueprints", href: "/crm/settings/blueprints" },
  { label: "Territories", href: "/crm/settings/territories" },
  { label: "Scoring Rules", href: "/crm/settings/scoring-rules" },
  { label: "Assignment Rules", href: "/crm/settings/assignment-rules" },
  { label: "SLA Policies", href: "/crm/settings/sla" },
  { label: "Email Templates", href: "/crm/settings/email-templates" },
  { label: "Custom Fields", href: "/crm/settings/custom-fields" },
  { label: "Record Layouts", href: "/crm/settings/layouts" },
  { label: "Products", href: "/crm/settings/products" },
  { label: "Pricebooks", href: "/crm/settings/pricebooks" },
  { label: "Quote Settings", href: "/crm/settings/quotes" },
  { label: "Automations", href: "/crm/settings/automations" },
  { label: "Sequences", href: "/crm/settings/sequences" },
  { label: "AI Settings", href: "/crm/settings/ai" },
  { label: "Import / Export", href: "/crm/settings/import-export" },
  { label: "Audit Log", href: "/crm/settings/audit-log" },
] as const;

export default function CrmSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-3 py-1.5">
        <nav
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide"
          aria-label="CRM Settings"
        >
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
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
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
