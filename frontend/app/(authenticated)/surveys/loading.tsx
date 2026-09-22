import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { SurveyListSkeleton } from "@/features/surveys/list/survey-list-skeleton";

export default function SurveysLoading() {
  return (
    <PageWrapper
      title="Surveys"
      subtitle="Build surveys, quizzes, live polls, and lead forms."
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <SurveyListSkeleton />
      </div>
    </PageWrapper>
  );
}
