"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSurvey } from "@/hooks/api/surveys/forms";
import { SurveyBuilderHeader } from "@/features/surveys/builder/survey-builder-header";
import { SurveyBuilderTabs } from "@/features/surveys/builder/survey-builder-tabs";
import { SurveyDetailSkeleton } from "@/features/surveys/builder/survey-detail-skeleton";

interface SurveyDetailContentProps {
  surveyId: number;
}

export function SurveyDetailContent({ surveyId }: SurveyDetailContentProps) {
  const surveyQuery = useSurvey(surveyId);
  const { data: survey, isLoading, isPending, isError, error, refetch } = surveyQuery;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pageState = usePageState({
    permission: "surveys:view",
    isLoading: isLoading || (isPending && surveyQuery.access.pending),
    isError,
    error,
  });

  return (
    <PageWrapper
      title={survey?.title ?? "Survey"}
      backHref="/surveys"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={survey ? <SurveyBuilderHeader survey={survey} /> : undefined}
    >
      <PageState
        resolution={pageState}
        loading={<SurveyDetailSkeleton />}
        onRetry={handleRetry}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {survey ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <SurveyBuilderTabs survey={survey} />
          </div>
        ) : (
          <ErrorState className="flex-1" title="Couldn't load this survey" onRetry={handleRetry} />
        )}
      </PageState>
    </PageWrapper>
  );
}
