"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAccess } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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

export const CARD_GROUPS: CardGroup[] = [
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
        advanced: true,
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
        href: "/settings/notifications/providers",
        permission: "notifications:providers:view",
        advanced: true,
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
        title: "Reporting Managers",
        description: "Default manager, fallback order, additional managers and change limits",
        href: "/hr/settings/reporting-managers",
        permission: "hr:reporting-lines:manage",
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
      },
      {
        title: "Custom Fields",
        description: "Employee attribute extensions",
        href: "/hr/settings/custom-fields",
        permission: "hr:custom-fields:manage",
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
        description: "Webhooks, connected apps and devices",
        href: "/hr/settings/integrations",
        permission: "hr:integrations:manage",
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
        "shadow-panel transition-transform duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-status-info-rule hover:shadow-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{card.title}</p>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 motion-reduce:transition-none group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:translate-x-0" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
    </Link>
  );
}

interface Props {
  isAdvanced: boolean;
}

function HubGridSkeleton() {
  return (
    <div className="space-y-8 pb-6">
      {[0, 1].map((group) => (
        <section key={group} className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((card) => (
              <Skeleton key={card} className="h-24 rounded-xl" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function HubGrid({ isAdvanced }: Props) {
  const { data: access, isLoading, isError, error, refetch } = useAccess();
  const canOpen = (card: CardDef) => {
    if (access?.isOrgOwner) return true;
    const required = Array.isArray(card.permission)
      ? card.permission
      : [card.permission];
    return required.some((permission) =>
      access ? permission in access.scopes : false,
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

  const pageState = usePageState({
    isLoading,
    isError,
    error,
    isEmpty: accessibleGroups.length === 0,
  });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageState
      resolution={pageState}
      loading={<HubGridSkeleton />}
      onRetry={handleRetry}
      empty={
        <EmptyState
          illustrationPreset="settings"
          title="No settings available to you"
          description="Your role does not include any HR configuration yet. Ask an administrator for the settings permissions you need."
        />
      }
    >
    <div className="space-y-8 pb-6">
      {!isAdvanced && hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {hiddenCount} advanced {hiddenCount === 1 ? "tool is" : "tools are"} hidden in Simple view.
          Switch to Advanced above to show {hiddenCount === 1 ? "it" : "them"}.
        </p>
      )}
      {accessibleGroups.map((group) => {
        const visibleCards = group.cards.filter((c) => isAdvanced || !c.advanced);
        if (visibleCards.length === 0) return null;

        return (
          <section key={group.group}>
            <p className="text-dense font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
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
    </PageState>
  );
}
