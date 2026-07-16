import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PM_PANEL, PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function MeetingsLoading() {
  return (
    <PageWrapper
      title="Meetings"
      subtitle="Schedule meetings, standups, and retros for your project"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <Skeleton className={cn("h-14 w-full rounded-xl", PM_PANEL)} />
        <div className={cn("space-y-2 p-2", PM_PANEL)}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-3 border-b border-border/50 px-2 last:border-0"
            >
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 max-w-[14rem] flex-1" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
