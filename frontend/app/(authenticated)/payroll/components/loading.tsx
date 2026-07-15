import { PageWrapper } from "@/components/ui/page-wrapper";

export function ComponentsPageSkeleton() {
  return (
    <PageWrapper title="Component Catalog" subtitle="Loading…">
      <div className="space-y-3">
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-32 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
            >
              <div className="h-4 bg-muted animate-pulse rounded w-40" />
              <div className="h-5 bg-muted animate-pulse rounded w-20" />
              <div className="h-4 bg-muted animate-pulse rounded w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <ComponentsPageSkeleton />;
}
