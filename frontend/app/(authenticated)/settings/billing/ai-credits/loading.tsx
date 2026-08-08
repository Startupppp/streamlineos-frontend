import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function SettingsAiCreditsLoading() {
  return (
    <PageWrapper title="AI Credits" subtitle="Token-metered AI usage and credit wallet">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />

        <div className="space-y-4">
          <div className={FILTER_TOOLBAR_ROW}>
            <p className="text-sm font-semibold text-foreground shrink-0">Usage Analytics</p>
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-9 w-[110px] rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-4 text-sm font-semibold text-foreground">Daily Usage</p>
            <Skeleton className="h-[220px] w-full rounded-md" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">By Model</p>
              </div>
              <DataTableSkeleton rows={4} columns={7} />
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">By Feature</p>
              </div>
              <DataTableSkeleton rows={4} columns={5} />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Credit Packs</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[180px] rounded-lg border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Auto Top-Up</p>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-3/4" />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Usage History</p>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <DataTableSkeleton rows={20} columns={8} />
        </div>
      </div>
    </PageWrapper>
  );
}
