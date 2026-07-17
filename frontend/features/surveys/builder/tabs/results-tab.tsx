"use client";

import { EmptyChartIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview, useQuestionAnalytics } from "@/hooks/api/surveys/analytics";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { OverviewStats } from "@/features/surveys/results/overview-stats";
import { QuestionAnalyticsCard } from "@/features/surveys/results/question-analytics-card";
import { ResponseTable } from "@/features/surveys/results/response-table";
import { AssessmentResultsCard } from "@/features/surveys/results/assessment-results-card";

export function ResultsTab({ survey }: { survey: SurveyForm }) {
  const { data: overview, isLoading: overviewLoading, isError, refetch } = useAnalyticsOverview(survey.id);
  const { data: questionAnalytics, isLoading: questionsLoading } = useQuestionAnalytics(survey.id);

  if (overviewLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !overview) {
    return <ErrorState description="Failed to load results." onRetry={refetch} />;
  }

  if (overview.totalResponses === 0) {
    return (
      <EmptyState
        illustration={
          <div className="h-28 w-28">
            <EmptyChartIllustration />
          </div>
        }
        title="No responses yet"
        description="Results, question analytics, and exports will appear here once responses come in."
        compact
      />
    );
  }

  return (
    <div className="space-y-6">
      <OverviewStats overview={overview} />

      {survey.mode === "assessment" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Assessment</h3>
          <AssessmentResultsCard surveyId={survey.id} />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Question analytics</h3>
        {questionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {questionAnalytics?.map((analytics) => (
              <QuestionAnalyticsCard key={analytics.questionId} analytics={analytics} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Responses</h3>
        <ResponseTable surveyId={survey.id} />
      </div>
    </div>
  );
}
