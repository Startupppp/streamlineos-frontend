"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAccess } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/lib/rbac/permissions";

type CardDef = {
  title: string;
  description: string;
  href: string;
  permission: PermissionKey | PermissionKey[];
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
      {
        title: "Company Profile",
        description: "Org info, fiscal year, work week",
        href: "/settings/organization",
        permission: "settings:organization:manage",
      },
      {
        title: "Organization Structure",
        description: "Departments, teams, locations, and reporting lines",
        href: "/settings/organization/structure",
        permission: "settings:view",
      },
      {
        title: "Job Architecture",
        description: "Job roles and levels used by HR records",
        href: "/hr/org",
        permission: "hr:employees:view",
      },
      {
        title: "Permissions & Roles",
        description: "RBAC configuration",
        href: "/settings/roles",
        permission: "settings:rbac:manage",
      },
      {
        title: "Notification Providers",
        description: "Delivery providers, templates, and events",
        href: "/notifications/providers",
        permission: "notifications:providers:view",
      },
    ],
  },
  {
    group: "Policies & Rules",
    cards: [
      {
        title: "HR Policies",
        description: "Leave, attendance, overtime, and compliance rules",
        href: "/hr/settings/policies",
        permission: "hr:policies:view",
      },
      {
        title: "Effective Rule Preview",
        description: "See which rule applies to an employee on a date",
        href: "/hr/settings/preview",
        permission: "hr:policies:view",
        advanced: true,
      },
      {
        title: "Version History",
        description: "Browse and rollback policy, template, and workflow versions",
        href: "/hr/settings/versions",
        permission: "hr:policies:view",
        advanced: true,
      },
    ],
  },
  {
    group: "Workflows & Automation",
    cards: [
      {
        title: "Workflows",
        description: "Approval chains and HR process flows",
        href: "/hr/settings/workflows",
        permission: "hr:workflows:view",
        advanced: true,
      },
      {
        title: "Automations",
        description: "Trigger-based automation rules",
        href: "/hr/settings/automations",
        permission: "hr:automations:view",
        advanced: true,
      },
      {
        title: "Webhooks",
        description: "Outbound event webhooks and delivery logs",
        href: "/settings/webhooks",
        permission: "settings:webhooks:manage",
        advanced: true,
      },
    ],
  },
  {
    group: "Templates & Forms",
    cards: [
      {
        title: "Templates",
        description: "Offer, appraisal, contract templates",
        href: "/hr/settings/templates",
        permission: "hr:templates:view",
      },
      {
        title: "Forms",
        description: "Dynamic HR forms and intake",
        href: "/hr/settings/forms",
        permission: "hr:forms:view",
        advanced: true,
      },
      {
        title: "Custom Fields",
        description: "Employee attribute extensions",
        href: "/hr/settings/custom-fields",
        permission: "hr:custom-fields:manage",
        advanced: true,
      },
    ],
  },
  {
    group: "Data & Integrations",
    cards: [
      {
        title: "Import / Export",
        description: "Bulk employee data operations",
        href: "/hr/settings/import-export",
        permission: ["hr:import:manage", "hr:export:manage"],
      },
      {
        title: "Integrations",
        description: "Job boards and connected recruiting apps",
        href: "/hr/settings/integrations",
        permission: "hr:integrations:manage",
        advanced: true,
      },
      {
        title: "Policy & Workflow Simulator",
        description: "Dry-run policies and approval flows on sample employees",
        href: "/hr/simulator",
        permission: "hr:policies:manage",
        advanced: true,
      },
    ],
  },
  {
    group: "People Config",
    cards: [
      {
        title: "Employee Records",
        description: "All employees",
        href: "/hr/employees",
        permission: "hr:employees:view",
      },
      {
        title: "Onboarding Flows",
        description: "New joiner steps",
        href: "/hr/onboarding",
        permission: "hr:onboarding:manage",
      },
      {
        title: "All HR modules",
        description: "Browse the full HRMS catalogue",
        href: "/hr",
        permission: "hr:employees:view",
      },
    ],
  },
];

function CardItem({ card }: { card: CardDef }) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative flex flex-col gap-2 h-full rounded-2xl border border-border/70 bg-card/90 p-4",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-blue-500/25 hover:shadow-[0_14px_28px_-16px_rgba(37,99,235,0.25)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{card.title}</p>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
    </Link>
  );
}

interface Props {
  isAdvanced: boolean;
  onSwitchToAdvanced?: () => void;
}

export function HubGrid({ isAdvanced, onSwitchToAdvanced }: Props) {
  const { data: access } = useAccess();
  const canOpen = (card: CardDef) => {
    if (access?.isOrgOwner) return true;
    const required = Array.isArray(card.permission)
      ? card.permission
      : [card.permission];
    return required.some((permission) =>
      access?.permissions.includes(permission),
    );
  };
  const accessibleGroups = CARD_GROUPS.map((group) => ({
    ...group,
    cards: group.cards.filter(canOpen),
  })).filter((group) => group.cards.length > 0);
  const hiddenCount = isAdvanced
    ? 0
    : accessibleGroups.reduce(
        (count, group) => count + group.cards.filter((c) => c.advanced).length,
        0,
      );

  return (
    <div className="space-y-8 pb-6">
      {!isAdvanced && hiddenCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200/70 bg-blue-50/60 px-4 py-3 dark:border-blue-500/25 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Simple view shows the guided essentials. {hiddenCount} advanced tools — workflows,
            automations, simulator, versioning, and integrations — are hidden.
          </p>
          {onSwitchToAdvanced && (
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              className="inline-flex w-fit shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Switch to Advanced
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {accessibleGroups.map((group) => {
        const visibleCards = group.cards.filter((c) => isAdvanced || !c.advanced);
        if (visibleCards.length === 0) return null;

        return (
          <section key={group.group}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
              {group.group}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {visibleCards.map((card) => (
                <CardItem key={card.href + card.title} card={card} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
