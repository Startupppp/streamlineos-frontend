"use client";

import {
  Building2, GitBranch, Users, UsersRound, MapPin, DollarSign,
  ChevronRight, Plus, Network, Settings, AlertCircle, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useOrgHierarchyOverview } from "@/hooks/api/org-hierarchy";
import { useOrgSettings } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  {
    title: "Business Units",
    icon: Building2,
    href: "/organization/business-units",
    key: "businessUnits" as const,
    description: "Top-level organizational divisions",
    addHref: "/organization/business-units",
  },
  {
    title: "Branches",
    icon: GitBranch,
    href: "/organization/branches",
    key: "branches" as const,
    description: "Physical or regional office branches",
    addHref: "/organization/branches",
  },
  {
    title: "Departments",
    icon: Users,
    href: "/organization/departments",
    key: "departments" as const,
    description: "Functional departments within branches",
    addHref: "/organization/departments",
  },
  {
    title: "Teams",
    icon: UsersRound,
    href: "/organization/teams",
    key: "teams" as const,
    description: "Teams within departments",
    addHref: "/organization/teams",
  },
  {
    title: "Locations",
    icon: MapPin,
    href: "/organization/locations",
    key: "locations" as const,
    description: "Physical work locations and offices",
    addHref: "/organization/locations",
  },
  {
    title: "Cost Centers",
    icon: DollarSign,
    href: "/organization/cost-centers",
    key: "costCenters" as const,
    description: "Financial cost centers for tracking",
    addHref: "/organization/cost-centers",
  },
];

const QUICK_ACTIONS = [
  { label: "Add Branch", icon: GitBranch, href: "/organization/branches" },
  { label: "Add Department", icon: Users, href: "/organization/departments" },
  { label: "Add Team", icon: UsersRound, href: "/organization/teams" },
  { label: "View Tree", icon: Network, href: "/organization/tree" },
  { label: "Org Settings", icon: Settings, href: "/settings/organization" },
];

function HealthCheck({ count, label, ok }: { count: number; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={ok ? "outline" : "secondary"} className="ml-auto text-xs h-5">
        {count}
      </Badge>
    </div>
  );
}

export default function OrganizationOverviewPage() {
  const { data: overview, isLoading } = useOrgHierarchyOverview();
  const { data: org } = useOrgSettings();

  const isSetupComplete = Boolean(
    org?.industry && org?.timezone && (overview?.businessUnits ?? 0) > 0
  );

  return (
    <PageWrapper
      title="Organization"
      subtitle="Manage your company hierarchy, locations, and cost centers."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const count = overview?.[section.key];

            return (
              <Link key={section.href} href={section.href} className="block">
                <div className="bg-muted/40 hover:bg-muted/60 rounded-lg p-3 cursor-pointer h-full transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">{section.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{section.description}</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 rounded" />
                  ) : (
                    <p className="text-xl font-bold tabular-nums">{count ?? 0}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                    <Plus className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Hierarchy Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : (
                <>
                  <HealthCheck
                    count={overview?.businessUnits ?? 0}
                    label="Business units configured"
                    ok={(overview?.businessUnits ?? 0) > 0}
                  />
                  <HealthCheck
                    count={overview?.branches ?? 0}
                    label="Branches active"
                    ok={(overview?.branches ?? 0) > 0}
                  />
                  <HealthCheck
                    count={overview?.departments ?? 0}
                    label="Departments defined"
                    ok={(overview?.departments ?? 0) > 0}
                  />
                  <HealthCheck
                    count={overview?.locations ?? 0}
                    label="Work locations added"
                    ok={(overview?.locations ?? 0) > 0}
                  />
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      {isSetupComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className={isSetupComplete ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {isSetupComplete ? "Setup complete" : "Setup incomplete"}
                      </span>
                      {!isSetupComplete && (
                        <Link href="/settings/organization" className="ml-auto">
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                            Complete setup →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
