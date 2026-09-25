"use client";

import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

interface ProjectSettingsPortalPageProps {
  projectId: number;
}

export function ProjectSettingsPortalPage({ projectId }: ProjectSettingsPortalPageProps) {
  const pageState = usePageState({
    permission: "build:clientvisibility:manage",
    isLoading: false,
    isError: false,
    error: undefined,
    isEmpty: true,
  });

  return (
    <PageWrapper
      title="Portal"
      subtitle="Control what external clients see of this project"
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
              title="Portal settings"
              description="Configure which milestones, updates, and files are visible to external clients through the client portal."
              action={{ label: "Go to client portal", href: `/build/${projectId}/client-portal` }}
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
