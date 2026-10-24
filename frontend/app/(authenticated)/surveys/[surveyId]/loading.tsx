import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SurveyDetailSkeleton } from "@/features/surveys/builder/survey-detail-skeleton";

export default function SurveyDetailLoading() {
  return (
    <PageWrapper
      title="Survey"
      backHref="/surveys"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="ml-2 h-9 w-36 rounded-md" />
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
