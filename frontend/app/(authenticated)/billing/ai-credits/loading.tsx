import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AiCreditsLoading() {
  return (
    <PageWrapper title="AI Credits" subtitle="Token-metered AI usage and credit wallet">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-sm"
            >
              <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-[110px] rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-4 h-4 w-24" />
            <Skeleton className="h-[220px] w-full rounded-md" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-lg" />
            ))}
          </div>
        </div>

        <Skeleton className="h-[88px] w-full rounded-lg" />

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
