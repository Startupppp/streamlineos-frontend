"use client";

import { Building2, GitBranch, Users, UsersRound, MapPin, DollarSign, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useOrgHierarchyOverview } from "@/lib/api/hooks/org-hierarchy";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SECTIONS = [
  {
    title: "Business Units",
    icon: Building2,
    href: "/organization/business-units",
    key: "businessUnits" as const,
    description: "Top-level organizational divisions",
  },
  {
    title: "Branches",
    icon: GitBranch,
    href: "/organization/branches",
    key: "branches" as const,
    description: "Physical or regional office branches",
  },
  {
    title: "Departments",
    icon: Users,
    href: "/organization/departments",
    key: "departments" as const,
    description: "Functional departments within branches",
  },
  {
    title: "Teams",
    icon: UsersRound,
    href: "/organization/teams",
    key: "teams" as const,
    description: "Teams within departments",
  },
  {
    title: "Locations",
    icon: MapPin,
    href: "/organization/locations",
    key: "locations" as const,
    description: "Physical work locations and offices",
  },
  {
    title: "Cost Centers",
    icon: DollarSign,
    href: "/organization/cost-centers",
    key: "costCenters" as const,
    description: "Financial cost centers for tracking",
  },
];

export default function OrganizationOverviewPage() {
  const { data: overview, isLoading } = useOrgHierarchyOverview();

  return (
    <PageWrapper
      title="Organization"
      subtitle="Manage your company hierarchy, locations, and cost centers."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const count = overview?.[section.key];

          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:bg-muted/40 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 rounded" />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums">{count ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
