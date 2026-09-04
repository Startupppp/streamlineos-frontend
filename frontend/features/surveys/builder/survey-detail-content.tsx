"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurvey } from "@/hooks/api/surveys/forms";
import { SurveyBuilderHeader } from "@/features/surveys/builder/survey-builder-header";
import { SurveyBuilderTabs } from "@/features/surveys/builder/survey-builder-tabs";
import { SurveyActivityPanel } from "@/features/surveys/builder/survey-activity-panel";

interface SurveyDetailContentProps {
  surveyId: number;
}

export function SurveyDetailContent({ surveyId }: SurveyDetailContentProps) {
  const { data: survey, isLoading, isError, refetch } = useSurvey(surveyId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title={survey?.title ?? "Survey"}
      backHref="/surveys"
      actions={survey ? <SurveyBuilderHeader survey={survey} /> : undefined}
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !survey ? (
          <ErrorState
            description="This survey did not load."
            onRetry={handleRetry}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <SurveyBuilderTabs survey={survey} />
            <SurveyActivityPanel survey={survey} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
