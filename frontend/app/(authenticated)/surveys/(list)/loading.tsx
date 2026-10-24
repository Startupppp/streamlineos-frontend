import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { SurveyListSkeleton } from "@/features/surveys/list/survey-list-skeleton";

export default function SurveysLoading() {
  return (
    <PageWrapper
      title="Surveys"
      subtitle="Build surveys, quizzes, live polls, and lead forms."
      actions={<Skeleton className="h-9 w-full max-w-full rounded-md sm:w-[7.5rem]" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-[12rem] flex-1 basis-[12rem] rounded-md md:max-w-xs" />
          <Skeleton className="hidden h-9 w-[8.5rem] rounded-md md:block" />
          <Skeleton className="hidden h-9 w-[8.5rem] rounded-md md:block" />
          <Skeleton className="size-9 shrink-0 rounded-md md:hidden" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <SurveyListSkeleton />
      </div>
    </PageWrapper>
  );
}
