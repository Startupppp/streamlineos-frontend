import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <PageWrapper
      title="Announcements"
      subtitle="Stay updated with company news and updates"
      actions={<Skeleton className="h-9 w-[140px] rounded-md" />}
    >
      <div className="space-y-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border shadow-sm p-5"
          >
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
