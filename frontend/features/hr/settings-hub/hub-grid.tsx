"use client";

import Link from "next/link";
import { useCan } from "@/hooks/api/access";

type CardDef = {
  title: string;
  description: string;
  href: string;
  permission: string;
  advanced?: boolean;
};

type CardGroup = {
  group: string;
  cards: CardDef[];
};

const CARD_GROUPS: CardGroup[] = [
  {
    group: "Organization",
    cards: [
      { title: "Company Profile", description: "Org info, fiscal year, work week", href: "/hr/settings/company", permission: "hr:employees:view" },
      { title: "Locations & Departments", description: "Structure, reporting lines", href: "/hr/org", permission: "hr:employees:view" },
      { title: "Permissions & Roles", description: "RBAC configuration", href: "/settings/roles", permission: "hr:employees:view" },
      { title: "Notifications", description: "Delivery providers and events", href: "/admin/notifications", permission: "hr:employees:view" },
    ],
  },
  {
    group: "Policies & Rules",
    cards: [
      { title: "HR Policies", description: "Leave, attendance, overtime, and compliance rules", href: "/hr/settings/policies", permission: "hr:policies:view" },
      { title: "Effective Rule Preview", description: "See which rule applies to an employee on a date", href: "/hr/settings/preview", permission: "hr:policies:view" },
      { title: "Version History", description: "Browse and rollback policy, template, and workflow versions", href: "/hr/settings/versions", permission: "hr:policies:view" },
    ],
  },
  {
    group: "Workflows & Automation",
    cards: [
      { title: "Workflows", description: "Approval chains and HR process flows", href: "/hr/settings/workflows", permission: "hr:workflows:view", advanced: true },
      { title: "Automations", description: "Trigger-based automation rules", href: "/hr/settings/automations", permission: "hr:automations:view", advanced: true },
      { title: "Webhooks", description: "HR event webhooks", href: "/hr/settings/integrations", permission: "hr:automations:view", advanced: true },
    ],
  },
  {
    group: "Templates & Forms",
    cards: [
      { title: "Templates", description: "Offer, appraisal, contract templates", href: "/hr/settings/templates", permission: "hr:templates:view" },
      { title: "Forms", description: "Dynamic HR forms and intake", href: "/hr/settings/forms", permission: "hr:templates:view" },
      { title: "Custom Fields", description: "Employee attribute extensions", href: "/hr/settings/custom-fields", permission: "hr:employees:view" },
    ],
  },
  {
    group: "Data & Integrations",
    cards: [
      { title: "Import / Export", description: "Bulk employee data operations", href: "/hr/settings/import-export", permission: "hr:employees:view" },
      { title: "Integrations", description: "Connected HR systems and apps", href: "/hr/settings/integrations", permission: "hr:automations:view", advanced: true },
      { title: "Config Sandbox", description: "Test workflows and automations", href: "/hr/settings/automations", permission: "hr:automations:view", advanced: true },
    ],
  },
  {
    group: "People Config",
    cards: [
      { title: "Employee Records", description: "All employees", href: "/hr/employees", permission: "hr:employees:view" },
      { title: "Onboarding Flows", description: "New joiner steps", href: "/hr/onboarding", permission: "hr:employees:view" },
    ],
  },
];

function CardItem({ card }: { card: CardDef }) {
  const can = useCan(card.permission as Parameters<typeof useCan>[0]);
  if (!can) return null;

  return (
    <Link href={card.href}>
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 hover:border-blue-500/50 hover:shadow-md transition-all group cursor-pointer h-full">
        <p className="text-sm font-semibold text-foreground">{card.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
      </div>
    </Link>
  );
}

interface Props {
  isAdvanced: boolean;
}

export function HubGrid({ isAdvanced }: Props) {
  return (
    <div>
      {CARD_GROUPS.map((group) => {
        const visibleCards = group.cards.filter((c) => isAdvanced || !c.advanced);
        if (visibleCards.length === 0) return null;

        return (
          <div key={group.group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-6 first:mt-0">
              {group.group}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleCards.map((card) => (
                <CardItem key={card.href + card.title} card={card} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
