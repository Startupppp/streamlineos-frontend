import type { ComponentProps } from "react";
import { PageState } from "@/components/shared/page-state";
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
import { INSIGHT_VIEWS } from "./product-insights-tabs";
import { PRODUCT_SETTINGS_TABS } from "./product-settings-tabs";
import { MANAGED_PRODUCT_ROUTE_TITLES } from "./managed-product-route-title";

export function ManagedProductLoadingPageWrapper(props: ComponentProps<typeof PageWrapper>) {
  const loading = <PageWrapper {...props} />;
  return <PageState resolution={{ kind: "loading" }} loading={loading}>{loading}</PageState>;
}

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

function ActionSkeleton({ className }: { className: string }) {
  return <Skeleton className={cn("h-9 rounded-md", className)} />;
}

export function ManagedProductOverviewRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.overview}
      subtitle={<Skeleton className="h-4 w-64 max-w-full" />}
      badge={<Skeleton className="h-5 w-10 rounded-full" />}
      contentClassName="h-auto"
      actions={<ActionSkeleton className="w-32" />}
      filters={<RouteToolbar controls={["w-28", "w-32", "w-24"]} />}
    >
      <ManagedProductOverviewSkeleton />
    </ManagedProductLoadingPageWrapper>
  );
}

export function ProductFeedbackRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.feedback}
      subtitle="Submissions collected from widgets linked to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-36" />}
      filters={<RouteToolbar search controls={["w-24"]} />}
    >
      <ManagedProductDetailShell>
        <DataTableSkeleton rows={10} headers={FEEDBACK_SKELETON_HEADERS} mobileCards />
      </ManagedProductDetailShell>
    </ManagedProductLoadingPageWrapper>
  );
}

function InsightTabStripRow({
  tabs,
  activeId,
}: {
  tabs: readonly { id: string; label: string }[];
  activeId: string;
}) {
  return (
    <div className="box-border flex h-9 w-full min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-input bg-card p-1 text-muted-foreground md:w-fit">
      {tabs.map((tab) => (
        <span
          key={tab.id}
          className={cn(
            "inline-flex h-7 min-w-fit flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium md:flex-none",
            tab.id === activeId && "bg-foreground text-background shadow-sm",
          )}
        >
          {tab.label}
        </span>
      ))}
    </div>
  );
}

function InsightTabStrip() {
  return <InsightTabStripRow tabs={INSIGHT_VIEWS} activeId="overview" />;
}

export function ProductInsightsRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.insights}
      subtitle="Customer signals, planned work, and delivery progress"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<ActionSkeleton className="w-28" />}
      filters={<InsightTabStrip />}
    >
      <ManagedProductDetailShell className="h-auto min-h-full flex-none overflow-visible">
        <ProductInsightsSkeleton />
      </ManagedProductDetailShell>
    </ManagedProductLoadingPageWrapper>
  );
}

export function ProductRoadmapRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.roadmap}
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
    </ManagedProductLoadingPageWrapper>
  );
}

export function ProductGoalsRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.goals}
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
    </ManagedProductLoadingPageWrapper>
  );
}

export function ProductProjectsRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.projects}
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
    </ManagedProductLoadingPageWrapper>
  );
}

function SettingsTabStrip() {
  return (
    <div className="box-border flex h-9 w-full min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-input bg-card p-1 text-muted-foreground md:w-fit">
      {PRODUCT_SETTINGS_TABS.map((tab) => (
        <span
          key={tab.id}
          className={cn(
            "inline-flex h-7 min-w-fit flex-1 items-center justify-center whitespace-nowrap rounded-md px-2 text-sm font-medium sm:px-3 md:flex-none",
            tab.id === "general" && "bg-foreground text-background shadow-sm",
          )}
        >
          {tab.label}
        </span>
      ))}
    </div>
  );
}

export function ProductSettingsRouteLoading() {
  return (
    <ManagedProductLoadingPageWrapper
      title={MANAGED_PRODUCT_ROUTE_TITLES.settings}
      subtitle="Configure this product"
      filters={<SettingsTabStrip />}
    >
      <ProductSettingsSkeleton />
    </ManagedProductLoadingPageWrapper>
  );
}
