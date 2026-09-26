"use client";

import { useCallback, useState } from "react";
import { Plus, Archive } from "lucide-react";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PM_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions-plan";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { ManagedProduct } from "@/types/projects";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  buildManagedProductColumns,
  ManagedProductMobileCard,
} from "./managed-product-table-columns";
import { FEEDBACK_SKELETON_HEADERS } from "./product-feedback-columns";
import { GoalsSkeleton } from "./product-goals-page";
import { RoadmapSkeleton } from "./product-roadmap-page";

const GALLERY_ROWS: ManagedProduct[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  orgId: "org-1",
  name: `${["Payments Platform", "Identity Service", "Notification Hub", "Analytics Engine", "Search Service", "Cache Layer", "Auth Gateway", "Data Pipeline", "Event Bus", "Config Store", "Audit Trail", "Content Delivery", "API Gateway", "SDK Tooling"][i % 14]}`,
  key: `MP-${100 + i}`,
  description: i % 3 === 0 ? `Core service #${i + 1} for the platform` : null,
  status: i % 3 === 0 ? "active" : i % 3 === 1 ? "active" : "archived",
  ownerId: i % 2 === 0 ? "user-1" : null,
  ownerMembershipId: i % 2 === 0 ? 1 : null,
  vision: null,
  missionStatement: null,
  targetCustomer: null,
  differentiators: null,
  currentPhase: null,
  targetLaunchDate: null,
  successMetrics: null,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-11-01T00:00:00Z",
}));

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

function GalleryCase({
  id,
  title,
  children,
  navActive = false,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  navActive?: boolean;
}) {
  return (
    <section
      data-case={id}
      aria-label={title}
      className={navActive ? "mobile-nav-active" : undefined}
    >
      <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className="flex h-[32rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {children}
      </div>
    </section>
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

  return (
    <DataTable
      data={GALLERY_ROWS}
      columns={columns}
      getRowKey={(row) => row.id}
      minWidth="720px"
      mobileCard={renderMobileCard}
      className={PM_FILL_PANEL}
      pagination={{
        mode: "cursor",
        pageSize: 20,
        hasMore: true,
        hasPrevious: true,
        onNext: () => undefined,
        onPrevious: () => undefined,
      }}
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
    <GalleryCase id={caseId} title={title} navActive={navActive}>
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
    </GalleryCase>
  );
}

export function ManagedProductsGallery() {
  return (
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
            className={PM_FILL_PANEL}
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
            className={PM_FILL_PANEL}
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

      <GalleryCase id="denied" title="Access denied">
        <NoPermissionState permission="build:managed-products:view" />
      </GalleryCase>

      <ManagedProductsGalleryList
        caseId="mobile-nav-clearance"
        title="Mobile bottom nav mounted"
        actions={TWO_ACTIONS}
        navActive
        body={<ManagedProductsReadyTable />}
      />

      <GalleryCase id="feedback-loading" title="Feedback — loading skeleton">
        <DataTableSkeleton
          rows={8}
          headers={FEEDBACK_SKELETON_HEADERS}
          className="flex-1"
        />
      </GalleryCase>

      <GalleryCase id="feedback-empty" title="Feedback — empty">
        <EmptyState
          className={PM_FILL_PANEL}
          illustrationPreset="projects"
          title="No feedback submissions"
          description="Submissions from widgets linked to this product will appear here."
        />
      </GalleryCase>

      <GalleryCase id="goals-loading" title="Goals — loading skeleton">
        <div className="overflow-y-auto p-4">
          <GoalsSkeleton />
        </div>
      </GalleryCase>

      <GalleryCase id="goals-empty" title="Goals — empty">
        <EmptyState
          className={PM_FILL_PANEL}
          illustrationPreset="projects"
          title="No goals yet"
          description="Create goals linked to this product."
        />
      </GalleryCase>

      <GalleryCase id="roadmap-loading" title="Roadmap — loading skeleton">
        <div className="overflow-y-auto p-4">
          <RoadmapSkeleton />
        </div>
      </GalleryCase>

      <GalleryCase id="roadmap-empty" title="Roadmap — empty">
        <EmptyState
          className={PM_FILL_PANEL}
          illustrationPreset="projects"
          title="No roadmap items yet"
          description="Add items to plan what this product is working toward."
        />
      </GalleryCase>
    </div>
  );
}
