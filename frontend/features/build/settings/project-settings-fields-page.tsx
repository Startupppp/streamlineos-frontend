"use client";

import { useCallback } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { CustomFieldsSettings } from "@/features/build/settings/custom-fields-settings";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

interface ProjectSettingsFieldsPageProps {
  projectId: number;
}

export function ProjectSettingsFieldsPage({ projectId }: ProjectSettingsFieldsPageProps) {
  const listFilters = useBuildListFilters({ withSearch: true });

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);
  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

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
      title="Custom Fields"
      subtitle="Define additional data fields for tickets in this project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search fields…",
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
          <PmSection index={0}>
            <PmPanel className="p-4" solid>
              <div className="mb-3 border-b border-border pb-3">
                <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                  Custom Fields
                </h3>
                <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                  Add text, number, date, or select fields to capture
                  project-specific information on every ticket.
                </p>
              </div>
              <CustomFieldsSettings projectId={projectId} />
            </PmPanel>
          </PmSection>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
