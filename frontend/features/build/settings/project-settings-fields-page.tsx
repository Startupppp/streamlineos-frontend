"use client";

import { useCallback, useRef, useState } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { useProjectCustomFields } from "@/hooks/api/build/custom-fields";
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
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import type { CustomFieldItem } from "@/features/build/settings/custom-fields-settings";

interface ProjectSettingsFieldsPageProps {
  projectId: number;
}

export function ProjectSettingsFieldsPage({ projectId }: ProjectSettingsFieldsPageProps) {
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const createFieldRef = useRef<(() => void) | null>(null);
  const editFieldRef = useRef<((field: CustomFieldItem) => void) | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const { data: customFields } = useProjectCustomFields(projectId);

  const filteredCount = listFilters.debouncedSearch
    ? (customFields ?? []).filter((f) =>
        f.name.toLowerCase().includes(listFilters.debouncedSearch.toLowerCase()),
      ).length
    : (customFields?.length ?? 0);

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const handleKeyboardCreate = useCallback(() => {
    createFieldRef.current?.();
  }, []);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      if (!customFields) return;
      const visible = listFilters.debouncedSearch
        ? customFields.filter((f) =>
            f.name.toLowerCase().includes(listFilters.debouncedSearch.toLowerCase()),
          )
        : customFields;
      const field = visible[index];
      if (field) editFieldRef.current?.(field);
    },
    [customFields, listFilters.debouncedSearch],
  );

  useBuildListKeyboard({
    itemCount: filteredCount,
    onOpen: handleKeyboardOpen,
    onCreate: handleKeyboardCreate,
    onEdit: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    onShortcutHelp: handleShortcutHelp,
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
      title="Custom Fields"
      subtitle="Define additional data fields for tickets in this project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search fields…",
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
              <CustomFieldsSettings
                projectId={projectId}
                search={listFilters.debouncedSearch || undefined}
                createRef={createFieldRef}
                editRef={editFieldRef}
              />
            </PmPanel>
          </PmSection>
        </PageState>
      </PmPageShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </PageWrapper>
  );
}
