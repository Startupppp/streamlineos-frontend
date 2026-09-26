"use client";

import { useCallback, useRef } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAgentTokens } from "@/hooks/api/build/agent-tokens";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { AgentTokensSection } from "@/features/build/settings/agent-tokens-section";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

interface ProjectSettingsAgentsPageProps {
  projectId: number;
}

export function ProjectSettingsAgentsPage({ projectId: _projectId }: ProjectSettingsAgentsPageProps) {
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: tokens } = useAgentTokens();

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);

  useBuildListKeyboard({
    itemCount: tokens?.length ?? 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
  });

  const pageState = usePageState({
    permission: "build:update",
    isLoading: false,
    isError: false,
    error: undefined,
  });

  return (
    <PageWrapper
      title="Agents"
      subtitle="Configure AI agents and their access to this project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search agent tokens…",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
        />
      }
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
          <div className="flex flex-col gap-4">
            <PmSection index={0}>
              <PmPanel className="p-4" solid>
                <div className="mb-3 border-b border-border pb-3">
                  <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                    Agent Credentials
                  </h3>
                  <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                    API tokens allow agents to authenticate with Streamline. Tokens
                    inherit the permissions of the issuing member.
                  </p>
                </div>
                <AgentTokensSection />
              </PmPanel>
            </PmSection>
          </div>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
