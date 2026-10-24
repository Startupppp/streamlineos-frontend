import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SurveyDetailSkeleton } from "@/features/surveys/builder/survey-detail-skeleton";

export default function SurveyDetailLoading() {
  return (
    <PageWrapper
      title="Survey"
      backHref="/surveys"
      actions={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-9 w-28 max-w-full rounded-md sm:ml-2 sm:w-36" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SurveyDetailSkeleton />
      </div>
    </PageWrapper>
  );
}
