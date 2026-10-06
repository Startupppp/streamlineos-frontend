"use client";

import Link from "next/link";
import { ManagedProductFormSheet } from "@/features/build/managed-products/managed-product-form-sheet";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, Map, MessageSquare, Target } from "lucide-react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { LinkedProjectRow } from "./linked-project-row";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import {
  useManagedProductOverview,
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "./use-managed-product-overview";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

export function ManagedProductOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={1} />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function ManagedProductOverviewPage({ managedProductId }: ManagedProductOverviewPageProps) {
  const {
    listFilters,
    searchInputRef,
    rawOwner,
    rawStatus,
    rawSort,
    ownerOptions,
    product,
    editOpen,
    setEditOpen,
    resolution,
    overviewSubtitle,
    editActions,
    focusedIndex,
    linkedProjects,
    hasMoreProjects,
    linkedProjectsLabel,
    roadmapItems,
    hasMoreRoadmap,
    goalsLabel,
    feedbackTotal,
    productDataUpdatedAt,
    insightsIsLoading,
    goalsIsLoading,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    handleRetry,
    handleStatusChange,
    handleSortChange,
    handleOwnerChange,
  } = useManagedProductOverview(managedProductId);

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={overviewSubtitle}
      actions={<BuildHeaderActions actions={editActions} />}
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search linked projects…",
            label: "Search linked projects",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "owner",
              label: "Owner",
              active: listFilters.isActive("ownerId"),
              control: (
                <BuildFilterSelect
                  label="Owner"
                  value={rawOwner}
                  onValueChange={handleOwnerChange}
                  options={ownerOptions}
                />
              ),
            },
            {
              id: "sort",
              label: "Sort",
              active: listFilters.isActive("sort"),
              control: (
                <BuildFilterSelect
                  label="Sort"
                  value={rawSort}
                  onValueChange={handleSortChange}
                  options={PROJECT_SORT_OPTIONS}
                />
              ),
            },
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={rawStatus}
                  onValueChange={handleStatusChange}
                  options={PROJECT_STATUS_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      {product ? (
        <ManagedProductFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          defaultValues={product}
        />
      ) : null}
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        empty={
          <EmptyState
            title="Product not found"
            description="This product may have been deleted or moved."
            className="flex-1"
          />
        }
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <BuildOfflineNotice dataUpdatedAt={productDataUpdatedAt} />

          <StatCardGrid cols={3}>
            <StatCard
              label="Linked projects"
              value={linkedProjectsLabel}
              icon={Briefcase}
              tone="blue"
              isLoading={insightsIsLoading}
              href={`/build/managed-products/${managedProductId}/projects`}
            />
            <StatCard
              label="Goals"
              value={goalsLabel}
              icon={Target}
              tone="emerald"
              isLoading={goalsIsLoading}
              href={`/build/managed-products/${managedProductId}/goals`}
            />
            <StatCard
              label="Feedback"
              value={String(feedbackTotal)}
              icon={MessageSquare}
              tone="amber"
              isLoading={insightsIsLoading}
              href={`/build/managed-products/${managedProductId}/feedback`}
            />
          </StatCardGrid>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-medium">Roadmap</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {roadmapItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roadmap items for this product yet.
                </p>
              ) : (
                roadmapItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{item.title}</span>
                    <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro">
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
              {hasMoreRoadmap && (
                <Link
                  href={`/build/managed-products/${managedProductId}/roadmap`}
                  className="block text-dense text-primary hover:underline"
                >
                  View full roadmap
                </Link>
              )}
            </CardContent>
          </Card>

          {linkedProjects.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium">Linked projects</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedProjects.map((proj, index) => (
                  <LinkedProjectRow
                    key={proj.id}
                    project={proj}
                    focused={focusedIndex === index}
                  />
                ))}
                {hasMoreProjects && (
                  <Link
                    href={`/build/managed-products/${managedProductId}/projects`}
                    className="block text-dense text-primary hover:underline"
                  >
                    View all linked projects
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {product?.vision && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium">Vision</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.vision}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageState>
    </PageWrapper>
  );
}
