import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_PANEL_SOLID, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailShell,
} from "../managed-product-detail-layout";

const UPCOMING_ROWS = ["upcoming-1", "upcoming-2", "upcoming-3", "upcoming-4"];
const SHIPPED_ROWS = ["shipped-1", "shipped-2", "shipped-3", "shipped-4", "shipped-5"];

function PanelHeader() {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-4 w-6" />
    </div>
  );
}

export function ProductReleasesSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <StatCardGridSkeleton cols={4} count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className={cn(CONTENT_PANEL_SOLID, "overflow-hidden lg:col-span-2")}>
          <PanelHeader />
          <div className="flex flex-col divide-y divide-border">
            {UPCOMING_ROWS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className={cn(CONTENT_PANEL_SOLID, "overflow-hidden lg:col-span-3")}>
          <PanelHeader />
          <div className="flex flex-col gap-5 px-4 py-4">
            {SHIPPED_ROWS.map((key) => (
              <div key={key} className="flex gap-3">
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="mt-1 size-2.5 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductReleasesRouteLoading() {
  return (
    <PageWrapper
      title="Releases"
      subtitle={<Skeleton className="h-4 w-40" />}
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 shrink-0 rounded-md" />
        </div>
      }
    >
      <ManagedProductDetailShell>
        <ProductReleasesSkeleton />
      </ManagedProductDetailShell>
    </PageWrapper>
  );
}
