"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Calendar, Map, Unlink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/shared/page-state";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  getColorSafe,
  healthDotColors,
  healthStatusColors,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { projectHealthLabel } from "@/lib/project-health";
import { resolveTargetDate, dateToneClasses, StatusDot } from "@/features/build/project-list/project-table-actions";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "@/features/build/managed-products/managed-product-detail-layout";
import { useProductProjectsPage, type LinkedProjectRow } from "./use-product-projects-page";

const LinkExistingProjectDialog = dynamic(
  () =>
    import("@/features/build/project-list/link-existing-project-dialog").then(
      (m) => ({ default: m.LinkExistingProjectDialog }),
    ),
  { ssr: false },
);

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const HEALTH_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
];

const ALL_SENTINEL = "all";

function ContributionCell({ row }: { row: LinkedProjectRow }) {
  const { percent, totalTickets } = row.contribution;
  if (totalTickets === 0) {
    return <span className="text-xs text-muted-foreground">No tickets</span>;
  }
  const pct = percent !== null ? Math.round(percent) : 0;
  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{pct}%</span>
        <span className="font-mono tabular-nums text-muted-foreground/70">
          {row.contribution.doneTickets}/{totalTickets}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" aria-label={`${row.name} contribution`} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const display = projectStatusDisplayLabels[status] ?? status;
  const color = getColorSafe(projectStatusColors, status);
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium", color)}
    >
      <StatusDot status={status} />
      {display}
    </Badge>
  );
}

function HealthBadge({ health }: { health: string | null }) {
  if (!health) return <span className="text-xs text-muted-foreground">—</span>;
  const dotColor = getColorSafe(healthDotColors, health);
  const badgeColor = getColorSafe(healthStatusColors, health);
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium", badgeColor)}
    >
      <span
        className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
        aria-hidden="true"
      />
      {projectHealthLabel(health)}
    </Badge>
  );
}

function NextMilestoneCell({ row }: { row: LinkedProjectRow }) {
  if (!row.nextMilestone) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const { name, targetDate } = row.nextMilestone;
  const tone = resolveTargetDate(targetDate, "ACTIVE");
  return (
    <div className="flex flex-col gap-0.5">
      <span className="max-w-[140px] truncate text-xs font-medium">{name}</span>
      {tone ? (
        <span className={cn("flex items-center gap-1 text-xs", dateToneClasses[tone.tone])}>
          <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
          {tone.label}
        </span>
      ) : null}
    </div>
  );
}

interface ProductProjectsPageProps {
  managedProductId: number;
}

export function ProductProjectsPage({ managedProductId }: ProductProjectsPageProps) {
  const router = useRouter();
  const {
    canManage,
    rows,
    hasMore,
    hasPrevious,
    resolution,
    isFiltered,
    isFilteredEmpty,
    isLoading,
    statusValue,
    healthValue,
    searchValue,
    searchInputRef,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkProjectId,
    unlinkMutation,
    headerActions,
    handleStatusChange,
    handleHealthChange,
    handleSearchChange,
    handleClearFilters,
    handleNextPage,
    handlePreviousPage,
    handleUnlinkClick,
    handleUnlinkConfirm,
    handleUnlinkDialogOpenChange,
    handleRetry,
  } = useProductProjectsPage({ managedProductId });

  const handleRowClick = useCallback(
    (row: LinkedProjectRow) => router.push(`/build/projects/${row.id}`),
    [router],
  );

  const columns = useMemo<DataTableColumn<LinkedProjectRow>[]>(
    () => [
      {
        key: "name",
        header: "Project",
        cell: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-[200px] truncate font-medium text-sm">{row.name}</span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground">{row.key}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "nextMilestone",
        header: "Next milestone",
        cell: (row) => <NextMilestoneCell row={row} />,
      },
      {
        key: "contribution",
        header: "Contribution",
        cell: (row) => <ContributionCell row={row} />,
      },
      {
        key: "dates",
        header: "Dates",
        cell: (row) => {
          const start = row.startDate ? format(new Date(row.startDate), "MMM d, yyyy") : null;
          const end = row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : null;
          if (!start && !end) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {start ? <span>From {start}</span> : null}
              {end ? <span>To {end}</span> : null}
            </div>
          );
        },
      },
      {
        key: "roadmapItems",
        header: "Roadmap items",
        cell: (row) =>
          row.linkedRoadmapItemCount > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Map className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-mono tabular-nums">{row.linkedRoadmapItemCount}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      ...(canManage
        ? [
            {
              key: "actions",
              header: "",
              cell: (row: LinkedProjectRow) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Unlink ${row.name} from product`}
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnlinkClick(row);
                  }}
                >
                  <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                  Unlink
                </Button>
              ),
            },
          ]
        : []),
    ],
    [canManage, handleUnlinkClick],
  );

  const mobileCard = useCallback(
    (row: LinkedProjectRow) => (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="font-mono tabular-nums text-xs text-muted-foreground">{row.key}</p>
          </div>
          <StatusBadge status={row.status} />
        </div>
        <ContributionCell row={row} />
        {row.nextMilestone ? (
          <p className="text-xs text-muted-foreground truncate">{row.nextMilestone.name}</p>
        ) : null}
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleUnlinkClick(row);
            }}
          >
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
            Unlink from product
          </Button>
        ) : null}
      </div>
    ),
    [canManage, handleUnlinkClick],
  );

  return (
    <PageWrapper
      title="Linked Projects"
      subtitle="Projects contributing to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={
        <BuildListToolbar
          search={{
            value: searchValue,
            onValueChange: handleSearchChange,
            placeholder: "Search projects…",
            label: "Search projects",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: Boolean(statusValue),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue || ALL_SENTINEL}
                  onValueChange={(v) => handleStatusChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "All statuses" }, ...STATUS_OPTIONS]}
                />
              ),
            },
            {
              id: "health",
              label: "Health",
              active: Boolean(healthValue),
              control: (
                <BuildFilterSelect
                  label="Health"
                  value={healthValue || ALL_SENTINEL}
                  onValueChange={(v) => handleHealthChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "Any health" }, ...HEALTH_OPTIONS]}
                />
              ),
            },
          ]}
          onClearAll={isFiltered ? handleClearFilters : undefined}
        />
      }
      actions={<BuildHeaderActions actions={headerActions} />}
    >
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection index={0}>
          <PageState
            resolution={resolution}
            loading={<DataTableSkeleton mobileCards />}
            empty={
              isFilteredEmpty ? (
                <EmptyState
                  illustration={<EmptyProjectsIllustration />}
                  title="No projects match filters"
                  filtersActive
                  onClearFilters={handleClearFilters}
                />
              ) : (
                <EmptyState
                  illustration={<EmptyProjectsIllustration />}
                  title="No linked projects yet"
                  description="Link existing projects to this product to track their contribution."
                  action={
                    canManage
                      ? { label: "Link existing project", onClick: () => setLinkDialogOpen(true) }
                      : undefined
                  }
                />
              )
            }
            onRetry={handleRetry}
          >
            <DataTable
              data={rows}
              columns={columns}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              mobileCard={mobileCard}
              pagination={{
                mode: "cursor",
                pageSize: 20,
                hasMore,
                onNext: handleNextPage,
                hasPrevious,
                onPrevious: handlePreviousPage,
              }}
            />
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      <ConfirmDialog
        open={unlinkProjectId !== null}
        onOpenChange={handleUnlinkDialogOpenChange}
        title="Unlink project from product?"
        description="The project will be removed from this product's Projects tab. The project itself is not deleted."
        confirmLabel="Unlink"
        destructive
        isPending={unlinkMutation.isPending}
        onConfirm={handleUnlinkConfirm}
      />

      <LinkExistingProjectDialog
        managedProductId={managedProductId}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
    </PageWrapper>
  );
}
