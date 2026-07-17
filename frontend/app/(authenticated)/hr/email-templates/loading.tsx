import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function EmailTemplatesLoading() {
  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates for HR communications"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-3">
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 mt-1" />
                <Skeleton className="h-3 w-full mt-1" />
                <Skeleton className="h-3 w-3/4 mt-0.5" />
              </div>
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
