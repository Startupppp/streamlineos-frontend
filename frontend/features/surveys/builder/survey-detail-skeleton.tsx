import { Skeleton } from "@/components/ui/skeleton";

const BUILDER_TABS = 5;
const SECTION_PLACEHOLDERS = 2;

export function SurveyDetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {Array.from({ length: BUILDER_TABS }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        {Array.from({ length: SECTION_PLACEHOLDERS }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
