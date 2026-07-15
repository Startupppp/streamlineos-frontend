import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function QaLoading() {
  return (
    <PageWrapper title="QA / Tests" subtitle="Test cases and runs">
      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <Skeleton className={cn("h-10 w-52 rounded-xl", PM_PANEL)} />
        <div className={cn("space-y-3 p-3", PM_PANEL)}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-44 rounded-md" />{" "}
            <Skeleton className="h-4 w-32 rounded-md" />{" "}
            <Skeleton className="ml-auto h-7 w-28 rounded-md" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex h-8 items-center gap-3 border-b border-border/50 px-2 last:border-0"
            >
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
