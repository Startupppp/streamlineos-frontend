"use client";

import { useCallback } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { ProjectsGitIntegrationSettings } from "@/features/build/settings/git-integration-settings";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

interface ProjectSettingsIntegrationsPageProps {
  projectId: number;
}

export function ProjectSettingsIntegrationsPage({ projectId: _projectId }: ProjectSettingsIntegrationsPageProps) {
  const handleKeyboardOpen = useCallback((_index: number) => {}, []);
  const handleKeyboardClear = useCallback(() => {}, []);

  useBuildListKeyboard({
    itemCount: 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
  });

  const pageState = usePageState({
    permission: "build:update",
    isLoading: false,
    isError: false,
    error: undefined,
  });

  return (
    <PageWrapper
      title="Integrations"
      subtitle="Connect external services and configure outbound event delivery"
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
          className="flex-1"
        >
          <PmSection index={0}>
            <PmPanel className="p-4" solid>
              <div className="mb-3 border-b border-border pb-3">
                <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                  Git Integration
                </h3>
                <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                  Link commits, pull requests, and branches to tickets in this
                  project.
                </p>
              </div>
              <ProjectsGitIntegrationSettings />
            </PmPanel>
          </PmSection>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
