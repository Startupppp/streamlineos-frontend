"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSurvey } from "@/hooks/api/surveys/forms";
import { SurveyBuilderHeader } from "@/features/surveys/builder/survey-builder-header";
import { SurveyBuilderTabs } from "@/features/surveys/builder/survey-builder-tabs";
import { SurveyActivityPanel } from "@/features/surveys/builder/survey-activity-panel";
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
      actions={survey ? <SurveyBuilderHeader survey={survey} /> : undefined}
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <PageState resolution={pageState} loading={<SurveyDetailSkeleton />} onRetry={handleRetry} className="flex-1">
          {survey ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <SurveyBuilderTabs survey={survey} />
              <SurveyActivityPanel survey={survey} />
            </div>
          ) : (
            <ErrorState className="flex-1" title="Couldn't load this survey" onRetry={handleRetry} />
          )}
        </PageState>
      </div>
    </PageWrapper>
  );
}
