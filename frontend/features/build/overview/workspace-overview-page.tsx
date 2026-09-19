"use client";

import { useState } from "react";
import Link from "next/link";
import { usePmWorkspace, usePmWorkspaceMembers } from "@/hooks/api/build/pm-workspaces";
import { useAllWork } from "@/hooks/api/build/all-work";
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
import { Users, LayoutGrid } from "lucide-react";

interface WorkspaceOverviewPageProps {
  pmWorkspaceId: string;
}

function WorkspaceOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={2} />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function WorkspaceOverviewPage({ pmWorkspaceId }: WorkspaceOverviewPageProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const canCreate = useCan("build:create");
  const workspaceQuery = usePmWorkspace(pmWorkspaceId);
  const membersQuery = usePmWorkspaceMembers(pmWorkspaceId, { limit: 5 });
  const myWorkQuery = useAllWork({
    scope: "mine",
    pmWorkspaceId,
    limit: 10,
    excludeStatus: "DONE,CANCELLED",
  });

  const isLoading =
    workspaceQuery.isLoading || membersQuery.isLoading || myWorkQuery.isLoading;

  const isError =
    workspaceQuery.isError || membersQuery.isError || myWorkQuery.isError;

  const resolution = usePageState({
    permission: "build:workspaces:view",
    isLoading,
    isError,
    isEmpty: !workspaceQuery.data,
  });

  const workspace = workspaceQuery.data;
  const membersPage = membersQuery.data;
  const myWork = myWorkQuery.data;

  const firstPageMemberCount = membersPage?.data?.length ?? 0;
  const hasMoreMembers = membersPage?.pagination?.hasMore ?? false;
  const memberCountLabel = hasMoreMembers
    ? `${firstPageMemberCount}+`
    : String(firstPageMemberCount);

  const myWorkItems = myWork?.data ?? [];

  function handleRetry() {
    void workspaceQuery.refetch();
    void membersQuery.refetch();
    void myWorkQuery.refetch();
  }

  function handleOpenWizard() {
    setWizardOpen(true);
  }

  function handleWizardOpenChange(open: boolean) {
    setWizardOpen(open);
  }

  return (
    <PageWrapper
      title={workspace?.name ?? "Workspace overview"}
      badge={workspace?.status}
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
        loading={<WorkspaceOverviewSkeleton />}
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <StatCardGrid cols={2}>
            <StatCard
              label="Members"
              value={memberCountLabel}
              icon={Users}
              tone="blue"
              isLoading={membersQuery.isLoading}
              hint={hasMoreMembers ? "First page shown" : undefined}
            />
            <StatCard
              label="My open work"
              value={myWorkItems.length}
              icon={LayoutGrid}
              tone="violet"
              isLoading={myWorkQuery.isLoading}
              href={`/build/workspaces/${pmWorkspaceId}/all-work`}
            />
          </StatCardGrid>

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
                        <span className="font-mono text-dense text-muted-foreground shrink-0">
                          {item.projectKey}
                        </span>
                      )}
                      <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro shrink-0">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(myWork?.hasMore ?? false) && (
                  <Link
                    href={`/build/workspaces/${pmWorkspaceId}/all-work`}
                    className="block text-dense text-primary hover:underline"
                  >
                    View all in All work
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </PageState>

      {canCreate && (
        <ProjectCreateWizard
          open={wizardOpen}
          onOpenChange={handleWizardOpenChange}
          scope={{ pmWorkspaceId }}
        />
      )}
    </PageWrapper>
  );
}
