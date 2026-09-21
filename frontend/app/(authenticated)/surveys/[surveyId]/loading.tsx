import { PageWrapper } from "@/components/ui/page-wrapper";
import { SurveyDetailSkeleton } from "@/features/surveys/builder/survey-detail-skeleton";

export default function SurveyDetailLoading() {
  return (
    <PageWrapper title="Survey" backHref="/surveys">
      <div className="flex flex-1 min-h-0 flex-col">
        <SurveyDetailSkeleton />
      </div>
    </PageWrapper>
  );
}
