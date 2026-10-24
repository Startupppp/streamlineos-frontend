import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  SurveyBuilderHeaderSkeleton,
  SurveyDetailSkeleton,
} from "@/features/surveys/builder/survey-detail-skeleton";

export default function SurveyDetailLoading() {
  return (
    <PageWrapper
      title="Survey"
      backHref="/surveys"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<SurveyBuilderHeaderSkeleton />}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SurveyDetailSkeleton />
      </div>
    </PageWrapper>
  );
}
