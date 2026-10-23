import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <PageWrapper
      title="Company announcements"
      subtitle="Stay updated with company news and updates"
      actions={<Skeleton className="h-9 w-[8.5rem] max-w-full rounded-md sm:w-[140px]" />}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
          <div
            key={n}
            className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <Skeleton className="h-4 w-40 max-w-full sm:w-48" />
                  <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-3 w-28 max-w-full sm:w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 max-w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
