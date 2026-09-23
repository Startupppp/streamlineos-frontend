"use client";

import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PM_FILL_PANEL } from "@/components/pm-chrome";
import { GALLERY_HEADERS, ONE_ACTION, TWO_ACTIONS, FOUR_ACTIONS, GalleryList, ReadyTable } from "./build-list-gallery-cases";

export function BuildListGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Build list surfaces
        </h1>
        <p className="mt-1 text-label text-muted-foreground">
          Every state and responsive contract the Build list system promises,
          rendered from the shared components themselves.
        </p>
      </header>

      <GalleryList
        caseId="one-action-one-filter"
        title="One action · one filter"
        actions={ONE_ACTION}
        filterCount={1}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="two-actions-two-filters"
        title="Two actions · two filters"
        actions={TWO_ACTIONS}
        filterCount={2}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="four-actions-three-filters"
        title="Four actions · three filters"
        actions={FOUR_ACTIONS}
        filterCount={3}
        body={<ReadyTable />}
      />
      <GalleryList
        caseId="loading"
        title="Loading"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <DataTableSkeleton mobileCards
            rows={12}
            headers={GALLERY_HEADERS}
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="empty-true"
        title="True empty"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="projects"
            title="No projects yet"
            description="Create a project to start planning work."
            action={{ label: "New project" }}
          />
        }
      />
      <GalleryList
        caseId="empty-filtered"
        title="Filtered empty"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="projects"
            title="No projects yet"
            action={{ label: "New project" }}
            filtersActive
          />
        }
      />
      <GalleryList
        caseId="error"
        title="Error"
        actions={ONE_ACTION}
        filterCount={3}
        body={
          <ErrorState
            title="We could not load your projects"
            className="flex-1"
          />
        }
      />
      <GalleryList
        caseId="mobile-nav-clearance"
        title="Mobile bottom nav mounted"
        actions={TWO_ACTIONS}
        filterCount={3}
        body={<ReadyTable />}
        navActive
      />
    </div>
  );
}
