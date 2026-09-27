"use client";

import { useCallback, useRef, useState } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
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
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";

interface ProjectSettingsAgentsPageProps {
  projectId: number;
}

export function ProjectSettingsAgentsPage({ projectId: _projectId }: ProjectSettingsAgentsPageProps) {
  const isOnline = useOnlineStatus();
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const createTokenRef = useRef<(() => void) | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const { data: tokens } = useAgentTokens();

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleKeyboardCreate = useCallback(() => {
    createTokenRef.current?.();
  }, []);

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  useBuildListKeyboard({
    itemCount: tokens?.length ?? 0,
    onOpen: handleKeyboardOpen,
    onCreate: handleKeyboardCreate,
    onClearSelection: handleKeyboardClear,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
  });

  const pageState = usePageState({
    permission: "settings:api-tokens:read",
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
              {!isOnline && (
                <div
                  role="status"
                  className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
                >
                  You are offline — changes will not be saved until you reconnect.
                </div>
              )}
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
                <AgentTokensSection createRef={createTokenRef} />
              </PmPanel>
            </PmSection>
          </div>
        </PageState>
      </PmPageShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </PageWrapper>
  );
}
