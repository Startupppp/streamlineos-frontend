"use client";

import { useCallback, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { BuildListSurface } from "./build-list-surface";
import { GALLERY_STUB_ACCESS } from "./build-list-fixtures";
import { BuildHeaderActions } from "./build-header-actions";
import type { BuildHeaderAction } from "./build-header-actions-plan";
import { BuildListToolbar } from "./build-list-toolbar";
import {
  type GalleryRow,
  ROWS,
  COLUMNS,
  getRowKey,
  renderMobileCard,
  useGalleryFilters,
  noop,
  GALLERY_STATIC_PAGINATION,
  ONE_ACTION,
  TWO_ACTIONS,
  FOUR_ACTIONS,
  GALLERY_HEADERS,
} from "./build-list-gallery-data";
export type { GalleryRow };
export {
  ROWS,
  COLUMNS,
  GALLERY_HEADERS,
  getRowKey,
  renderMobileCard,
  noop,
  GALLERY_STATIC_PAGINATION,
  ONE_ACTION,
  TWO_ACTIONS,
  FOUR_ACTIONS,
  useGalleryFilters,
};

export function GalleryCase({
  id,
  title,
  children,
  navActive = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  navActive?: boolean;
}) {
  return (
    <section
      data-case={id}
      aria-label={title}
      className={navActive ? "mobile-nav-active" : undefined}
    >
      <h2 className="mb-1 text-sm font-medium text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className="flex h-[32rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {children}
      </div>
    </section>
  );
}

export function GalleryList({
  caseId,
  title,
  actions,
  filterCount,
  body,
  navActive,
}: {
  caseId: string;
  title: string;
  actions: BuildHeaderAction[];
  filterCount: number;
  body: ReactNode;
  navActive?: boolean;
}) {
  const filters = useGalleryFilters(filterCount);
  const [search, setSearch] = useState("");
  const handleClearAll = useCallback(() => setSearch(""), []);

  return (
    <GalleryCase id={caseId} title={title} navActive={navActive}>
      <PageWrapper
        title="All projects"
        subtitle="Browse and manage every project in your organization"
        actions={<BuildHeaderActions actions={actions} />}
        filters={
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search projects…",
              label: "Search projects",
            }}
            filters={filters}
            onClearAll={handleClearAll}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {body}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

function ReadyTableInner() {
  function handleNext() {
    return undefined;
  }
  function handlePrevious() {
    return undefined;
  }
  return (
    <BuildListSurface<GalleryRow>
      permission="build:view"
      rows={ROWS}
      columns={COLUMNS}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="780px"
      pagination={{
        mode: "cursor",
        pageSize: 20,
        pageNumber: 2,
        hasMore: true,
        hasPrevious: true,
        onNext: handleNext,
        onPrevious: handlePrevious,
      }}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No projects yet"
        />
      }
    />
  );
}

export function ReadyTable() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("build-list-gallery-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ReadyTableInner />
    </QueryClientProvider>
  );
}
