"use client";

import { useParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurvey } from "@/hooks/api/surveys/forms";
import { SurveyBuilderHeader } from "@/features/surveys/builder/survey-builder-header";
import { SurveyBuilderTabs } from "@/features/surveys/builder/survey-builder-tabs";
import { SurveyActivityPanel } from "@/features/surveys/builder/survey-activity-panel";

export default function SurveyDetailPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = Number(params.surveyId);
  const { data: survey, isLoading, isError } = useSurvey(surveyId);

  return (
    <DashboardGate permission="surveys:view">
      <RequireModule module="surveys">
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
              <ErrorState description="Survey not found." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <SurveyBuilderTabs survey={survey} />
                <SurveyActivityPanel survey={survey} />
              </div>
            )}
          </div>
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
