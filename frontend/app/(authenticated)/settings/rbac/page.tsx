"use client";

import Link from "next/link";
import { Shield, Users, Key, TrendingUp, ArrowRight } from "lucide-react";
import { useRoles, useRolesAnalytics } from "@/hooks/api/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RbacOverviewPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: analytics, isLoading: analyticsLoading } = useRolesAnalytics();

  return (
    <DashboardGate permission="settings:rbac:manage">
      <PageWrapper
        title="RBAC Overview"
        subtitle="Role-based access control analytics and coverage"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Roles"
              value={analyticsLoading ? undefined : analytics?.totalRoles}
              icon={Shield}
            />
            <StatCard
              label="Custom Roles"
              value={analyticsLoading ? undefined : analytics?.customRoles}
              icon={Key}
            />
            <StatCard
              label="Users Assigned"
              value={analyticsLoading ? undefined : analytics?.usersAssigned}
              icon={Users}
            />
            <StatCard
              label="Recent Changes"
              value={analyticsLoading ? undefined : analytics?.recentChanges}
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Roles</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/roles">
                  Manage Roles <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !roles?.length ? (
                <p className="text-sm text-muted-foreground">No roles found.</p>
              ) : (
                <div className="divide-y">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {(role as { memberCount?: number }).memberCount ?? 0}{" "}
                          members
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/settings/roles`}>Edit</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Permission Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total available permissions
                    </span>
                    <span className="font-medium">
                      {analytics?.totalPermissions ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">System roles</span>
                    <span className="font-medium">
                      {analytics?.systemRoles ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custom roles</span>
                    <span className="font-medium">
                      {analytics?.customRoles ?? 0}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/settings/permissions">
                        View Permission Matrix{" "}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </DashboardGate>
  );
}
