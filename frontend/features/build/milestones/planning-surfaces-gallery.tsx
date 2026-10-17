"use client";

import { useState } from "react";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { QueryClientProvider } from "@tanstack/react-query";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { GALLERY_STUB_ACCESS } from "@/features/build/shared/build-list-fixtures";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { RELEASES_TABLE_HEADERS } from "@/features/build/releases/releases-table-columns";
import { STUB_NOOP } from "./planning-surfaces-fixtures";
import { MilestoneGalleryWrapper, MilestoneListBody } from "./milestone-gallery-parts";
import { ReleaseGalleryWrapper, ReleasesReadyTable } from "./release-gallery-parts";

export function PlanningSurfacesGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("planning-surfaces-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Planning surfaces</h1>
        <p className="mt-1 text-label text-muted-foreground">
          Every state the Milestones and Releases pages can reach, rendered from
          the real page components.
        </p>
      </header>

      <MilestoneGalleryWrapper caseId="milestones-ready" title="Milestones — populated">
        <MilestoneListBody />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-empty-true" title="Milestones — true empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No milestones yet"
          description="Add milestones to track key checkpoints and target dates."
          action={{ label: "Add Milestone", onClick: STUB_NOOP }}
        />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-empty-filtered" title="Milestones — filtered empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No milestones yet"
          filtersActive
          onClearFilters={STUB_NOOP}
        />
      </MilestoneGalleryWrapper>

      <MilestoneGalleryWrapper caseId="milestones-error" title="Milestones — error">
        <ErrorState
          className="flex-1"
          title="Couldn't load milestones"
          description="An unexpected error occurred. Try again."
        />
      </MilestoneGalleryWrapper>

      <GalleryCase id="milestones-denied" title="Milestones — access denied">
        <NoPermissionState permission="build:view" />
      </GalleryCase>

      <ReleaseGalleryWrapper caseId="releases-ready" title="Releases — populated">
        <ReleasesReadyTable />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-loading" title="Releases — loading">
        <DataTableSkeleton
          mobileCards
          rows={8}
          headers={RELEASES_TABLE_HEADERS}
          className="flex-1"
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-empty-true" title="Releases — true empty">
        <EmptyState
          illustrationPreset="projects"
          title="No releases yet"
          description="Create your first release to track shipped features and versions."
          action={{ label: "New Release", onClick: STUB_NOOP }}
          className={CONTENT_FILL_PANEL}
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-empty-filtered" title="Releases — filtered empty">
        <EmptyState
          illustrationPreset="projects"
          title="No releases yet"
          filtersActive
          onClearFilters={STUB_NOOP}
          className={CONTENT_FILL_PANEL}
        />
      </ReleaseGalleryWrapper>

      <ReleaseGalleryWrapper caseId="releases-error" title="Releases — error">
        <ErrorState
          className="flex-1"
          title="We could not load your releases"
          description="An unexpected error occurred. Try again."
        />
      </ReleaseGalleryWrapper>

      <GalleryCase id="releases-denied" title="Releases — access denied">
        <NoPermissionState permission="build:view" />
      </GalleryCase>
    </div>
    </QueryClientProvider>
  );
}
