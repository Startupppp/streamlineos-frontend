import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function EmployeesLoading() {
  return (
    <PageWrapper
      title="Employee Directory"
      subtitle="Browse and manage all team members"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[88px] rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-60 rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
