import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DealDetailLoading() {
  return (
    <PageWrapper
      title="Deal"
      subtitle="Loading deal details…"
      badge={<Skeleton className="h-5 w-16 rounded" />}
      actions={
        <>
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-muted/30 border border-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20 rounded-lg" />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-64 lg:col-span-3 rounded-lg" />
          <Skeleton className="h-64 lg:col-span-2 rounded-lg" />
        </div>
      </div>
    </PageWrapper>
  );
}
