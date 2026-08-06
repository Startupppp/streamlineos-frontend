"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Coins,
  GitBranch,
  MapPin,
  Network,
  Users,
} from "lucide-react";
import { RequireModule } from "@/components/auth/require-module";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgHierarchyOverview } from "@/hooks/api/org-hierarchy";
import type { OrgHierarchyOverview } from "@/types/org-hierarchy";

interface StructureItem {
  title: string;
  description: string;
  href: string;
  countKey: keyof OrgHierarchyOverview;
  icon: typeof Building2;
}

const HIERARCHY_ITEMS: StructureItem[] = [
  {
    title: "Business Units",
    description: "Top-level divisions, brands, or lines of business.",
    href: "/organization/business-units",
    countKey: "businessUnits",
    icon: Building2,
  },
  {
    title: "Branches",
    description: "Regional or operational units that can own departments.",
    href: "/organization/branches",
    countKey: "branches",
    icon: GitBranch,
  },
  {
    title: "Departments",
    description: "Functional groups such as Sales, Finance, or Engineering.",
    href: "/organization/departments",
    countKey: "departments",
    icon: Briefcase,
  },
  {
    title: "Teams",
    description: "Delivery groups within departments, with leads and capacity.",
    href: "/organization/teams",
    countKey: "teams",
    icon: Users,
  },
];

const SUPPORTING_ITEMS: StructureItem[] = [
  {
    title: "Locations",
    description: "Physical or remote places where people work. A location is not a reporting unit.",
    href: "/organization/locations",
    countKey: "locations",
    icon: MapPin,
  },
  {
    title: "Cost Centers",
    description: "Financial tracking codes that can span the reporting hierarchy.",
    href: "/organization/cost-centers",
    countKey: "costCenters",
    icon: Coins,
  },
];

function StructureCard({
  item,
  count,
  isLoading,
}: {
  item: StructureItem;
  count: number;
  isLoading: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-muted/20">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
            <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <Badge variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-5 text-muted-foreground">{item.description}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
            Manage <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function OrganizationStructurePage() {
  const { data: overview, isLoading } = useOrgHierarchyOverview();

  return (
    <RequireModule module="hr">
      <PageWrapper
        title="Organization Structure"
        subtitle="Set up reporting units once, then use them consistently across people, access, payroll, and reporting."
        actions={
          <Link
            href="/organization/tree"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <Network className="h-4 w-4" />
            View organization chart
          </Link>
        }
      >
        <div className="space-y-6">
          <section aria-labelledby="reporting-hierarchy-heading" className="space-y-3">
            <div>
              <h2 id="reporting-hierarchy-heading" className="text-sm font-semibold">Reporting hierarchy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Business Unit → Branch → Department → Team. Use only the levels your organization needs.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {HIERARCHY_ITEMS.map((item) => (
                <StructureCard
                  key={item.href}
                  item={item}
                  count={overview?.[item.countKey] ?? 0}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="supporting-structure-heading" className="space-y-3">
            <div>
              <h2 id="supporting-structure-heading" className="text-sm font-semibold">Places and financial structure</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These dimensions support the hierarchy without changing who reports to whom.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SUPPORTING_ITEMS.map((item) => (
                <StructureCard
                  key={item.href}
                  item={item}
                  count={overview?.[item.countKey] ?? 0}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </section>

          <Card>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Network className="h-4 w-4 text-muted-foreground" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Organization Chart</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review the hierarchy as a visual tree. The chart is generated from the structure above.
                  </p>
                </div>
              </div>
              <Link href="/organization/tree" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline">
                Open chart <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </RequireModule>
  );
}
