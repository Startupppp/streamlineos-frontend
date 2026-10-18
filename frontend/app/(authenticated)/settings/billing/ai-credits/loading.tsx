import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function SettingsAiCreditsLoading() {
  return (
    <PageWrapper title="AI Credits" subtitle="Token-metered AI usage and credit wallet">
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <StatCardGridSkeleton cols={4} count={4} />

        <section className="flex flex-col gap-3">
          <div className={FILTER_TOOLBAR_ROW}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Usage</p>
              <p className="text-xs text-muted-foreground">
                Daily, model, and feature breakdown for the selected range
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-9 w-[110px] rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Daily usage</p>
            </div>
            <DataTableSkeleton rows={7} columns={4} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">By model</p>
              </div>
              <DataTableSkeleton rows={4} columns={7} />
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">By feature</p>
              </div>
              <DataTableSkeleton rows={4} columns={5} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Credit packs</p>
            <p className="text-xs text-muted-foreground">
              Purchase credits to top up your wallet
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[180px] rounded-lg" />
            ))}
          </div>
        </section>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">Auto top-up</p>
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">Transaction history</p>
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <DataTableSkeleton rows={20} columns={8} />
        </div>
      </div>
    </PageWrapper>
  );
}
