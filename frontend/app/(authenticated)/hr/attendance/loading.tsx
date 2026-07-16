import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours and manage check-ins"
      noInternalScroll
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
        <div className="lg:col-span-8 space-y-4">
          <Skeleton className="h-[280px] rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
