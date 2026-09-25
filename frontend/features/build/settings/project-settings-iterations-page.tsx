"use client";

import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

interface ProjectSettingsIterationsPageProps {
  projectId: number;
}

export function ProjectSettingsIterationsPage({ projectId: _projectId }: ProjectSettingsIterationsPageProps) {
  const pageState = usePageState({
    permission: "build:update",
    isLoading: false,
    isError: false,
    error: undefined,
    isEmpty: true,
  });

  return (
    <PageWrapper
      title="Iterations"
      subtitle="Configure default cadence and naming for project cycles"
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
              title="No iteration settings yet"
              description="Iteration defaults let you pre-configure cycle length and naming conventions for new cycles in this project."
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
