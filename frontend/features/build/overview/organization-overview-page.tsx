"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/api/build/projects";
import { useAllWork } from "@/hooks/api/build/all-work";
import { usePortfolios } from "@/hooks/api/build/portfolios";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ProjectCreateWizard } from "@/features/build/project-create/project-create-wizard";
import { PlusIcon } from "@animateicons/react/lucide";
import { FolderOpen, LayoutGrid } from "lucide-react";
import { resolveOverviewStatLabel } from "./overview-stat-label";

function OrganizationOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={1} />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function OrganizationOverviewPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const canCreate = useCan("build:create");
  const canViewPortfolios = useCan("build:portfolios:view");

  const projectsQuery = useProjects({ status: "ACTIVE", limit: 10 });
  const myWorkQuery = useAllWork({
    scope: "mine",
    limit: 10,
    excludeStatus: "DONE,CANCELLED",
  });
  const portfoliosQuery = usePortfolios({ limit: 5, status: "active" });

  const isLoading = projectsQuery.isLoading || myWorkQuery.isLoading;

  const isError = projectsQuery.isError || myWorkQuery.isError;

  const error = projectsQuery.error ?? myWorkQuery.error;

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: false,
  });

  const projectsData = projectsQuery.data;
  const myWorkItems = myWorkQuery.data?.data ?? [];
  const portfoliosData = portfoliosQuery.data;

  const projectCountLabel = projectsData
    ? resolveOverviewStatLabel(projectsData.data.length, projectsData.hasMore)
    : null;

  function handleOpenWizard() {
    setWizardOpen(true);
  }

  function handleWizardOpenChange(open: boolean) {
    setWizardOpen(open);
  }

  function handleRetry() {
    void projectsQuery.refetch();
    void myWorkQuery.refetch();
  }

  const hasStats = projectCountLabel !== null;

  return (
    <PageWrapper
      title="Organization overview"
      actions={
        canCreate ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenWizard}
          >
            New project
          </AnimatedIconButton>
        ) : null
      }
    >
      <PageState
        resolution={resolution}
        loading={<OrganizationOverviewSkeleton />}
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          {hasStats && (
            <StatCardGrid cols={2}>
              {projectCountLabel !== null && (
                <StatCard
                  label="Active projects"
                  value={projectCountLabel}
                  icon={FolderOpen}
                  tone="blue"
                  isLoading={projectsQuery.isLoading}
                  hint={projectsData?.hasMore ? "First page shown" : undefined}
                  href="/build"
                />
              )}
            </StatCardGrid>
          )}

          {myWorkItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">My open work</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {myWorkItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{item.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.projectKey && (
                        <span className="font-mono text-dense text-muted-foreground">
                          {item.projectKey}
                        </span>
                      )}
                      <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {myWorkItems.length === 0 && !myWorkQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>No open work assigned to you</span>
            </div>
          )}

          {canViewPortfolios && portfoliosData && portfoliosData.data.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">Portfolio health</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {portfoliosData.data.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{portfolio.name}</span>
                    {portfolio.health && (
                      <Badge
                        variant="outline"
                        className="h-5 px-2 py-0.5 text-micro shrink-0"
                      >
                        {portfolio.health}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </PageState>

      {canCreate && (
        <ProjectCreateWizard open={wizardOpen} onOpenChange={handleWizardOpenChange} />
      )}
    </PageWrapper>
  );
}
