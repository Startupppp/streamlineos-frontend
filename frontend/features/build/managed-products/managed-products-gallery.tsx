"use client";

import { useCallback, useState } from "react";
import { Plus, Archive } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { CONTENT_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions-plan";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { ManagedProduct } from "@/types/projects";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { GalleryCase as SharedGalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { MANAGED_PRODUCT_GALLERY_ROWS, GALLERY_STUB_ACCESS } from "@/features/build/shared/build-list-fixtures";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  buildManagedProductColumns,
  ManagedProductMobileCard,
} from "./managed-product-table-columns";
import { FEEDBACK_SKELETON_HEADERS } from "./product-feedback-columns";
import { GoalsSkeleton } from "./product-goals-page";
import { RoadmapSkeleton } from "./product-roadmap-page";
import { ProductInsightsPage } from "./product-insights-page";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ManagedProductOverviewSkeleton } from "@/features/build/overview/managed-product-overview-page";
import { GridSkeleton } from "@/features/build/project-list/projects-page-skeletons";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";

function stubOwnerOf(_id: string | null) {
  return _id ? { name: "Priya Nair", email: "priya@example.com" } : null;
}

const STUB_EDIT = () => undefined;
const STUB_DELETE = () => undefined;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "all", label: "Default" },
  { value: "name", label: "Name" },
  { value: "updated", label: "Last updated" },
];

const ONE_ACTION: BuildHeaderAction[] = [
  { id: "create", label: "New product", icon: Plus, primary: true },
];

const TWO_ACTIONS: BuildHeaderAction[] = [
  { id: "archive", label: "Archive", icon: Archive },
  ...ONE_ACTION,
];

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const STUB_CHANGE = () => undefined;

const STUB_INSIGHTS_ID = 1;

const STUB_INSIGHTS_DATA: ManagedProductInsights = {
  linkedProjectCount: 42,
  projectsByStatus: { active: 27, completed: 8, archived: 7 },
  submissionsByStatus: { open: 17, in_progress: 5, resolved: 14, archived: 6 },
  roadmapItemCount: 9,
  roadmapItemsByStatus: { planned: 4, in_progress: 3, completed: 1, cancelled: 1 },
  feedbackByStatus: { open: 11, planned: 3, in_progress: 4, completed: 6, declined: 2 },
  linkedFeedbackVoteCount: 38,
  ageDays: 0,
  confidenceScore: null,
  overrideReason: null,
  overriddenBy: null,
  overriddenAt: null,
};

function InsightsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("insights-ready-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.managedProducts.insights(STUB_INSIGHTS_ID),
      STUB_INSIGHTS_DATA,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProductInsightsPage managedProductId={STUB_INSIGHTS_ID} />
    </QueryClientProvider>
  );
}

function ManagedProductsReadyTable() {
  const columns = buildManagedProductColumns({
    canManage: true,
    ownerOf: stubOwnerOf,
    onEdit: STUB_EDIT,
    onDelete: STUB_DELETE,
  });

  const renderMobileCard = useCallback(
    (row: ManagedProduct) => (
      <ManagedProductMobileCard
        product={row}
        canManage
        ownerOf={stubOwnerOf}
        onEdit={STUB_EDIT}
        onDelete={STUB_DELETE}
      />
    ),
    [],
  );

  function getRowKey(row: ManagedProduct) { return row.id; }
  function handleNext() { return undefined; }
  function handlePrevious() { return undefined; }

  return (
    <BuildListSurface<ManagedProduct>
      permission="build:managed-products:view"
      rows={MANAGED_PRODUCT_GALLERY_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="720px"
      pagination={{ mode: "cursor", pageSize: 20, pageNumber: 2, hasMore: true, hasPrevious: true, onNext: handleNext, onPrevious: handlePrevious }}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="projects" title="No managed products yet" />}
    />
  );
}

function ManagedProductsGalleryList({
  caseId,
  title,
  actions,
  body,
  navActive,
}: {
  caseId: string;
  title: string;
  actions: BuildHeaderAction[];
  body: React.ReactNode;
  navActive?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setSort("all");
  }, []);

  return (
    <SharedGalleryCase id={caseId} title={title} navActive={navActive}>
      <PageWrapper
        title="Managed Products"
        subtitle="Track products and link projects to them"
        actions={<BuildHeaderActions actions={actions} />}
        filters={
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search products…",
              label: "Search products",
            }}
            filters={[
              {
                id: "status",
                label: "Status",
                active: status !== "all",
                control: (
                  <BuildFilterSelect
                    label="Status"
                    value={status}
                    onValueChange={setStatus}
                    options={STATUS_OPTIONS}
                  />
                ),
              },
              {
                id: "sort",
                label: "Sort",
                active: sort !== "all",
                control: (
                  <BuildFilterSelect
                    label="Sort"
                    value={sort}
                    onValueChange={setSort}
                    options={SORT_OPTIONS}
                  />
                ),
              },
            ]}
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
    </SharedGalleryCase>
  );
}

export function ManagedProductsGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("managed-products-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
