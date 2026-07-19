import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CoursesLoading() {
  return (
    <PageWrapper
      title="Course Library"
      subtitle="Explore and enroll in courses"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Tabs toolbar */}
        <div className="flex items-center gap-1 h-9 rounded-md bg-muted p-1 w-fit">
          <Skeleton className="h-7 w-28 rounded-sm" />
          <Skeleton className="h-7 w-24 rounded-sm" />
        </div>

        {/* Filter toolbar */}
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Course card grid — sm:2 lg:3 cols, 12 cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
