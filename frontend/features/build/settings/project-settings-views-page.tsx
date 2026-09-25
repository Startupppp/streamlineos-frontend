"use client";

import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

interface ProjectSettingsViewsPageProps {
  projectId: number;
}

export function ProjectSettingsViewsPage({ projectId: _projectId }: ProjectSettingsViewsPageProps) {
  const pageState = usePageState({
    permission: "build:update",
    isLoading: false,
    isError: false,
    error: undefined,
    isEmpty: true,
  });

  return (
    <PageWrapper
      title="Saved Views"
      subtitle="Manage shared filters and layouts for project issue lists"
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
          empty={
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title="No saved views yet"
              description="Saved views let the team share pre-configured filters, sorts, and layouts across the issues board and backlog."
            />
          }
          className="flex-1"
        >
          <PmSection index={0} className="flex-1" />
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
