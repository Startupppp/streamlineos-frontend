"use client";

import { useParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurvey } from "@/hooks/api/surveys/forms";
import { SurveyStatusBadge } from "@/features/surveys/list/survey-status-badge";

export default function SurveyDetailPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = Number(params.surveyId);
  const { data: survey, isLoading, isError } = useSurvey(surveyId);

  return (
    <DashboardGate permission="surveys:view">
      <RequireModule module="SURVEYS">
        <PageWrapper
          title={survey?.title ?? "Survey"}
          eyebrow="Surveys"
          backHref="/surveys"
          badge={survey ? <SurveyStatusBadge status={survey.status} /> : undefined}
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !survey ? (
            <ErrorState description="Survey not found." />
          ) : (
            <p className="text-sm text-muted-foreground">Builder coming soon.</p>
          )}
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
