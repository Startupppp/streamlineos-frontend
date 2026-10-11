import type { ReactNode } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import {
  ManagedProductDetailShell,
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
} from "./managed-product-detail-layout";
import {
  ManagedProductOverviewSkeleton,
  PRODUCT_PROJECT_SKELETON_HEADERS,
  ProductGoalsGridSkeleton,
  ProductGoalsStatRow,
  ProductInsightsSkeleton,
  ProductRoadmapSkeleton,
  ProductSettingsSkeleton,
} from "./managed-product-page-skeletons";
import { FEEDBACK_SKELETON_HEADERS } from "./product-feedback-columns";

function RouteToolbar({
  search = false,
  controls,
}: {
  search?: boolean;
  controls: readonly string[];
}) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      {search ? <Skeleton className="h-9 min-w-[12rem] flex-1 basis-[12rem] rounded-md" /> : null}
      {controls.map((width, index) => (
        <Skeleton key={`${width}-${index}`} className={cn("h-9 shrink-0 rounded-md", width)} />
      ))}
    </div>
  );
}

function ProductRouteLoading({
  title,
  subtitle,
  badge,
  contentClassName,
  actions,
  filters,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  contentClassName?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      badge={badge}
      contentClassName={contentClassName}
      actions={actions}
      filters={filters}
    >
      {children}
    </PageWrapper>
  );
}

function ActionSkeleton({ className }: { className: string }) {
  return <Skeleton className={cn("h-9 rounded-md", className)} />;
}

export function ManagedProductOverviewRouteLoading() {
  return (
    <ProductRouteLoading
      title={<Skeleton className="h-7 w-48" />}
      subtitle={<Skeleton className="h-4 w-64 max-w-full" />}
      badge={<Skeleton className="h-5 w-10 rounded-full" />}
      contentClassName="h-auto"
      actions={<ActionSkeleton className="w-32" />}
      filters={<RouteToolbar controls={["w-28", "w-32", "w-24"]} />}
    >
      <ManagedProductOverviewSkeleton />
    </ProductRouteLoading>
  );
}

export function ProductFeedbackRouteLoading() {
  return (
    <ProductRouteLoading
      title="Feedback"
      subtitle="Submissions collected from widgets linked to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-36" />}
      filters={<RouteToolbar search controls={["w-24"]} />}
    >
      <ManagedProductDetailShell>
        <DataTableSkeleton rows={10} headers={FEEDBACK_SKELETON_HEADERS} mobileCards />
      </ManagedProductDetailShell>
    </ProductRouteLoading>
  );
}

export function ProductInsightsRouteLoading() {
  return (
    <ProductRouteLoading
      title="Insights"
      subtitle="Customer signals, planned work, and delivery progress"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-28" />}
    >
      <ManagedProductDetailShell className="h-auto min-h-full flex-none overflow-visible">
        <ProductInsightsSkeleton />
      </ManagedProductDetailShell>
    </ProductRouteLoading>
  );
}

export function ProductRoadmapRouteLoading() {
  return (
    <ProductRouteLoading
      title="Roadmap"
      subtitle="Product roadmap items"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={
        <div className="flex items-center gap-2">
          <ActionSkeleton className="w-24" />
          <ActionSkeleton className="w-24" />
          <ActionSkeleton className="w-24" />
        </div>
      }
      filters={<RouteToolbar search controls={["w-28", "w-28", "w-24"]} />}
    >
      <ManagedProductDetailShell>
        <ProductRoadmapSkeleton />
      </ManagedProductDetailShell>
    </ProductRouteLoading>
  );
}

export function ProductGoalsRouteLoading() {
  return (
    <ProductRouteLoading
      title="Goals & OKRs"
      subtitle="Product objectives and key results"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-28" />}
      filters={<RouteToolbar search controls={["w-28", "w-32", "w-28", "w-24"]} />}
    >
      <ManagedProductDetailShell>
        <div className="shrink-0">
          <ProductGoalsStatRow />
        </div>
        <ProductGoalsGridSkeleton />
      </ManagedProductDetailShell>
    </ProductRouteLoading>
  );
}

export function ProductProjectsRouteLoading() {
  return (
    <ProductRouteLoading
      title="Linked Projects"
      subtitle="Projects contributing to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-32" />}
      filters={<RouteToolbar search controls={["w-28", "w-28", "w-36", "w-24"]} />}
    >
      <ManagedProductDetailShell>
        <DataTableSkeleton
          rows={10}
          headers={PRODUCT_PROJECT_SKELETON_HEADERS}
          mobileCards
        />
      </ManagedProductDetailShell>
    </ProductRouteLoading>
  );
}

export function ProductSettingsRouteLoading() {
  return (
    <ProductRouteLoading title="Settings" subtitle="Configure this product">
      <ProductSettingsSkeleton />
    </ProductRouteLoading>
  );
}
