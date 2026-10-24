import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BUILDER_TAB_WIDTHS = ["w-7 md:w-24", "w-7 md:w-20", "w-7 md:w-24", "w-7 md:w-20", "w-7 md:w-28"] as const;

function SectionCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full rounded-md sm:max-w-xs" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function SurveyDetailSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="box-border flex h-9 min-h-9 w-full min-w-0 max-w-full shrink-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-input bg-card p-1 scrollbar-hide md:w-fit">
        {BUILDER_TAB_WIDTHS.map((widthClass, index) => (
          <Skeleton key={index} className={`h-7 ${widthClass} shrink-0 rounded-md`} />
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
        <SectionCardSkeleton />
        <SectionCardSkeleton />
      </div>
    </div>
  );
}
