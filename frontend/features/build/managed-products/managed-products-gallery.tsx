"use client";

import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { CONTENT_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { GalleryCase as SharedGalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { MANAGED_PRODUCT_TABLE_HEADERS } from "./managed-product-table-columns";
import { FEEDBACK_SKELETON_HEADERS } from "./product-feedback-columns";
import { GoalsSkeleton } from "./product-goals-page";
import { RoadmapSkeleton } from "./product-roadmap-page";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ManagedProductOverviewSkeleton } from "@/features/build/overview/managed-product-overview-page";
import { GridSkeleton } from "@/features/build/project-list/projects-page-skeletons";
import {
  InsightsReadyFrame,
  ManagedProductsReadyTable,
  ManagedProductsGalleryList,
  ManagedProductsGalleryBase,
} from "./managed-products-gallery-frames";
import { ONE_ACTION, TWO_ACTIONS, STUB_CHANGE, RANGE_OPTIONS } from "./managed-products-gallery-stubs";

export function ManagedProductsGallery() {
  return (
    <ManagedProductsGalleryBase>
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Managed Products surfaces
        </h1>
        <p className="mt-1 text-label text-muted-foreground">
          Every state the Managed Products list page can reach, rendered from
          the real page components.
        </p>
      </header>

      <ManagedProductsGalleryList
        caseId="ready"
        title="Populated"
        actions={ONE_ACTION}
        body={<ManagedProductsReadyTable />}
      />

      <ManagedProductsGalleryList
        caseId="ready-two-actions"
        title="Two actions"
        actions={TWO_ACTIONS}
        body={<ManagedProductsReadyTable />}
      />

      <ManagedProductsGalleryList
        caseId="loading"
        title="Loading"
        actions={ONE_ACTION}
        body={
          <DataTableSkeleton
            mobileCards
            rows={12}
            headers={MANAGED_PRODUCT_TABLE_HEADERS}
            className="flex-1"
          />
        }
      />

      <ManagedProductsGalleryList
        caseId="empty-true"
        title="True empty"
        actions={ONE_ACTION}
        body={
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="projects"
            title="No managed products yet"
            description="Create a managed product to track delivery across projects."
            action={{ label: "New product" }}
          />
        }
      />

      <ManagedProductsGalleryList
        caseId="empty-filtered"
        title="Filtered empty"
        actions={ONE_ACTION}
        body={
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="projects"
            title="No managed products yet"
            filtersActive
          />
        }
      />

      <ManagedProductsGalleryList
        caseId="error"
        title="Error"
        actions={ONE_ACTION}
        body={
          <ErrorState
            title="We could not load your managed products"
            className="flex-1"
          />
        }
      />

      <SharedGalleryCase id="denied" title="Access denied">
        <NoPermissionState permission="build:managed-products:view" />
      </SharedGalleryCase>

      <ManagedProductsGalleryList
        caseId="mobile-nav-clearance"
        title="Mobile bottom nav mounted"
        actions={TWO_ACTIONS}
        navActive
        body={<ManagedProductsReadyTable />}
      />

      <SharedGalleryCase id="feedback-loading" title="Feedback — loading skeleton">
        <DataTableSkeleton
          rows={8}
          headers={FEEDBACK_SKELETON_HEADERS}
          className="flex-1"
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="feedback-empty" title="Feedback — empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No feedback submissions"
          description="Submissions from widgets linked to this product will appear here."
          action={{ label: "Clear filters" }}
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="goals-loading" title="Goals — loading skeleton">
        <div className="overflow-y-auto p-4">
          <GoalsSkeleton />
        </div>
      </SharedGalleryCase>

      <SharedGalleryCase id="goals-empty" title="Goals — empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No goals yet"
          description="Create goals linked to this product."
          action={{ label: "New goal" }}
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="roadmap-loading" title="Roadmap — loading skeleton">
        <div className="overflow-y-auto p-4">
          <RoadmapSkeleton />
        </div>
      </SharedGalleryCase>

      <SharedGalleryCase id="roadmap-empty" title="Roadmap — empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No roadmap items yet"
          description="Add items to plan what this product is working toward."
          action={{ label: "Add item" }}
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="overview-loading" title="Product overview — loading">
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-4">
          <ManagedProductOverviewSkeleton />
        </div>
      </SharedGalleryCase>

      <SharedGalleryCase id="overview-empty" title="Product overview — not found">
        <PageWrapper title="Payments Platform" backHref="/build/managed-products">
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="projects"
            title="Product not found"
            description="This product may have been deleted or moved."
          />
        </PageWrapper>
      </SharedGalleryCase>

      <SharedGalleryCase id="insights-loading" title="Insights — loading">
        <PageWrapper
          title="Insights"
          subtitle="Aggregated activity for this product"
          filters={
            <BuildListToolbar
              filters={[
                {
                  id: "range",
                  label: "Range",
                  active: false,
                  control: (
                    <BuildFilterSelect
                      label="Range"
                      value="all"
                      onValueChange={STUB_CHANGE}
                      options={RANGE_OPTIONS}
                    />
                  ),
                },
              ]}
              onClearAll={STUB_CHANGE}
            />
          }
        >
          <PmPageShell>
            <PmSection index={0} className="shrink-0">
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Projects</p>
                  <StatCardGridSkeleton cols={3} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Feedback submissions</p>
                  <StatCardGridSkeleton cols={4} />
                </div>
              </div>
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </SharedGalleryCase>

      <SharedGalleryCase id="insights-ready" title="Insights — ready (stub data)">
        <InsightsReadyFrame />
      </SharedGalleryCase>

      <SharedGalleryCase id="projects-loading" title="Linked projects — loading">
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-4">
          <GridSkeleton />
        </div>
      </SharedGalleryCase>

      <SharedGalleryCase id="projects-empty" title="Linked projects — empty">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No linked projects yet"
          description="Link projects to this product to track delivery."
          action={{ label: "Link project" }}
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="feedbucket-loading" title="Feedbucket — loading">
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PmPageShell>
      </SharedGalleryCase>

      <SharedGalleryCase id="feedbucket-empty" title="Feedbucket — no widget">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="projects"
          title="No feedback widget"
          description="Create a widget to embed on your product and start collecting feedback."
          action={{ label: "Create feedback widget" }}
        />
      </SharedGalleryCase>

      <SharedGalleryCase id="submission-loading" title="Submission detail — loading">
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </SharedGalleryCase>

      <SharedGalleryCase id="submission-empty" title="Submission detail — not found">
        <PageWrapper title="Submission" backHref="/build/1/feedbucket">
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="projects"
            title="Submission not found"
            description="This feedback submission was deleted, or the link is out of date."
          />
        </PageWrapper>
      </SharedGalleryCase>
    </div>
    </ManagedProductsGalleryBase>
  );
}
