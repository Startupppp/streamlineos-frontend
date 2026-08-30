"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  GitBranch,
  MapPin,
  Network,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AccessDenied } from "@/components/shared/access-denied";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess, useCan } from "@/hooks/api/access";
import { useOrgHierarchyOverview } from "@/hooks/api/org-hierarchy";
import { useOrgSettings } from "@/hooks/api/organization";
import { cn } from "@/lib/utils";
import type { OrgHierarchyOverview } from "@/types/org-hierarchy";

interface StructureLink {
  title: string;
  description: string;
  href: string;
  countKey: keyof OrgHierarchyOverview;
  icon: LucideIcon;
}

const HIERARCHY_ITEMS: StructureLink[] = [
  {
    title: "Business Units",
    description: "Divisions, brands, or lines of business",
    href: "/settings/organization/business-units",
    countKey: "businessUnits",
    icon: Building2,
  },
  {
    title: "Branches",
    description: "Regional or operational units",
    href: "/settings/organization/branches",
    countKey: "branches",
    icon: GitBranch,
  },
  {
    title: "Departments",
    description: "Functional groups like Sales or Finance",
    href: "/settings/organization/departments",
    countKey: "departments",
    icon: Briefcase,
  },
  {
    title: "Teams",
    description: "Delivery groups with leads and capacity",
    href: "/settings/organization/teams",
    countKey: "teams",
    icon: Users,
  },
];

const SUPPORTING_ITEMS: StructureLink[] = [
  {
    title: "Locations",
    description: "Where people work — not a reporting unit",
    href: "/settings/organization/locations",
    countKey: "locations",
    icon: MapPin,
  },
  {
    title: "Cost Centers",
    description: "Financial codes across the hierarchy",
    href: "/settings/organization/cost-centers",
    countKey: "costCenters",
    icon: Coins,
  },
];

function StructureRow({
  item,
  count,
  isLoading,
  showConnector,
}: {
  item: StructureLink;
  count: number;
  isLoading: boolean;
  showConnector?: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="relative">
      {showConnector ? (
        <div
          className="absolute -top-2 left-[1.375rem] hidden h-2 w-px bg-border sm:block"
          aria-hidden
        />
      ) : null}
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
          <Icon className="size-3.5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-label font-semibold text-foreground">
              {item.title}
            </p>
            {isLoading ? (
              <Skeleton className="h-4 w-6" />
            ) : (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-micro tabular-nums"
              >
                {count}
              </Badge>
            )}
          </div>
          <p className="truncate text-dense text-muted-foreground">
            {item.description}
          </p>
        </div>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </div>
  );
}

function HealthRow({
  label,
  count,
  ok,
  isLoading,
}: {
  label: string;
  count: number;
  ok: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {isLoading ? (
        <Skeleton className="size-4 rounded-full" />
      ) : ok ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-status-success-ink" />
      ) : (
        <AlertCircle className="size-3.5 shrink-0 text-status-warning-ink" />
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-4 w-6" />
      ) : (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export function OrganizationStructurePage() {
  const { data: accessData } = useAccess();
  const canView = useCan("settings:view");
  const { data: overview, isLoading, isError, error, refetch } = useOrgHierarchyOverview({
    enabled: canView,
  });
  const { data: org } = useOrgSettings({ enabled: canView });

  const totalEntities =
    (overview?.businessUnits ?? 0) +
    (overview?.branches ?? 0) +
    (overview?.departments ?? 0) +
    (overview?.teams ?? 0) +
    (overview?.locations ?? 0) +
    (overview?.costCenters ?? 0);

  const isSetupComplete = Boolean(
    org?.industry && org?.timezone && (overview?.businessUnits ?? 0) > 0,
  );

  if (accessData && !canView) {
    return (
      <PageWrapper
        title="Organization Structure"
        subtitle="Set up reporting units once, then reuse them across people, access, payroll, and reporting."
      >
        <AccessDenied message="You don't have permission to view organization settings." />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Organization Structure" subtitle="Set up reporting units once, then reuse them across people, access, payroll, and reporting.">
        <ErrorState className="flex-1" title="Couldn't load organization structure" description={getErrorMessage(error)} onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization Structure"
        subtitle={
          overview
            ? `${totalEntities} configured · Business Unit → Branch → Department → Team`
            : "Set up reporting units once, then reuse them across people, access, payroll, and reporting."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/settings/organization">
                <Settings className="size-3.5" />
                <span className="hidden sm:inline">Org settings</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5">
              <Link href="/settings/organization/chart">
                <Network className="size-3.5" />
                Chart
              </Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-label font-semibold text-foreground">
                  Reporting hierarchy
                </h2>
                <p className="mt-0.5 text-dense text-muted-foreground">
                  Use only the levels your organization needs.
                </p>
              </div>
              <div className="divide-y divide-border/60 p-1.5">
                {HIERARCHY_ITEMS.map((item, index) => (
                  <StructureRow
                    key={item.href}
                    item={item}
                    count={overview?.[item.countKey] ?? 0}
                    isLoading={isLoading}
                    showConnector={index > 0}
                  />
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-4">
              <section className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-label font-semibold text-foreground">
                    Places & finance
                  </h2>
                  <p className="mt-0.5 text-dense text-muted-foreground">
                    Support dimensions outside the reporting chain.
                  </p>
                </div>
                <div className="divide-y divide-border/60 p-1.5">
                  {SUPPORTING_ITEMS.map((item) => (
                    <StructureRow
                      key={item.href}
                      item={item}
                      count={overview?.[item.countKey] ?? 0}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-label font-semibold text-foreground">
                    Setup health
                  </h2>
                  {isLoading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-micro",
                        isSetupComplete
                          ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
                          : "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
                      )}
                    >
                      {isSetupComplete ? "Ready" : "Incomplete"}
                    </Badge>
                  )}
                </div>
                <div className="space-y-0.5">
                  <HealthRow
                    label="Business units"
                    count={overview?.businessUnits ?? 0}
                    ok={(overview?.businessUnits ?? 0) > 0}
                    isLoading={isLoading}
                  />
                  <HealthRow
                    label="Branches"
                    count={overview?.branches ?? 0}
                    ok={(overview?.branches ?? 0) > 0}
                    isLoading={isLoading}
                  />
                  <HealthRow
                    label="Departments"
                    count={overview?.departments ?? 0}
                    ok={(overview?.departments ?? 0) > 0}
                    isLoading={isLoading}
                  />
                  <HealthRow
                    label="Locations"
                    count={overview?.locations ?? 0}
                    ok={(overview?.locations ?? 0) > 0}
                    isLoading={isLoading}
                  />
                </div>
                {!isLoading && !isSetupComplete ? (
                  <Link
                    href="/settings/organization"
                    className="mt-3 inline-flex items-center gap-1 text-dense font-medium text-primary hover:underline"
                  >
                    Complete org profile
                    <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </PageWrapper>
  );
}
