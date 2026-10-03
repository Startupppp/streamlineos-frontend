"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useProjectRetentionSettings } from "@/hooks/api/build/project-retention-settings";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PmPageShell, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  parseRetentionSection,
  type RetentionSection,
} from "@/features/build/settings/project-settings-retention-schema";
import {
  PolicySection,
  HoldsSection,
} from "./project-settings-retention-sections";

const SECTION_PARAM = "section";

interface ProjectSettingsRetentionPageProps {
  projectId: number;
}

const SKELETON_LOADING = (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const NAV_SECTIONS: { id: RetentionSection; label: string }[] = [
  { id: "policy", label: "Policy" },
  { id: "holds", label: "Legal Holds" },
];

export function ProjectSettingsRetentionPage({ projectId }: ProjectSettingsRetentionPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canEdit = useCan("build:update");
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeSection = parseRetentionSection(searchParams.get(SECTION_PARAM));

  const handleSectionChange = useCallback(
    (section: RetentionSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(SECTION_PARAM, section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);

  useBuildListKeyboard({
    itemCount: 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
  });

  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectRetentionSettings(projectId);

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && settings === undefined,
  });

  const handleRefetch = useCallback(() => void refetch(), [refetch]);

  const emptyState = (
    <EmptyState
      className={CONTENT_FILL_PANEL}
      illustrationPreset="projects"
      title="Retention policy not configured"
      description="No retention policy has been recorded for this project. Saving one records the intended periods; automated enforcement is not active yet."
    />
  );

  return (
    <PageWrapper
      title="Retention"
      subtitle="Manage data retention periods and legal holds for this project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search retention settings…",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
        />
      }
    >
      <PmPageShell>
        <div className="mb-4 flex gap-1 border-b border-border pb-4">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={activeSection === s.id}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeSection === s.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
              onClick={() => handleSectionChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <PageState
          resolution={pageState}
          loading={SKELETON_LOADING}
          empty={emptyState}
          onRetry={handleRefetch}
          className="flex-1"
        >
          {settings !== undefined ? (
            activeSection === "policy" ? (
              <PolicySection
                settings={settings}
                projectId={projectId}
                canEdit={canEdit}
              />
            ) : (
              <HoldsSection
                settings={settings}
                projectId={projectId}
                canEdit={canEdit}
              />
            )
          ) : null}
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
