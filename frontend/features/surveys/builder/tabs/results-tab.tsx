"use client";

import { EmptyChartIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnalyticsOverview, useQuestionAnalytics } from "@/hooks/api/surveys/analytics";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { OverviewStats } from "@/features/surveys/results/overview-stats";
import { QuestionAnalyticsCard } from "@/features/surveys/results/question-analytics-card";
import { ResponseTable } from "@/features/surveys/results/response-table";
import { AssessmentResultsCard } from "@/features/surveys/results/assessment-results-card";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { streamSurveyResponseSummary } from "@/hooks/api/surveys/survey-ai";

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="survey-results-skeleton">
      <StatCardGridSkeleton cols={4} />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <DataTableSkeleton rows={6} columns={5} />
      </div>
    </div>
  );
}

export function ResultsTab({ survey }: { survey: SurveyForm }) {
  const overviewQuery = useAnalyticsOverview(survey.id);
  const questionsQuery = useQuestionAnalytics(survey.id);
  const canUseAi = useCan("surveys:ai:use");
  const overview = overviewQuery.data;
  const questionAnalytics = questionsQuery.data;

  const aiActions: AiAction[] = [
    {
      key: "summarize-responses",
      label: "Summarize responses",
      description: "AI narrative of key themes and insights",
      run: async (signal, onToken) => {
        const outcome = await streamSurveyResponseSummary({
          surveyId: survey.id,
          onToken,
          signal,
        });
        return { text: outcome.text };
      },
    },
  ];

  function handleRetryOverview() {
    void overviewQuery.refetch();
  }

  function handleRetryQuestions() {
    void questionsQuery.refetch();
  }

  if (overviewQuery.access.denied) {
    return <NoPermissionState permission="surveys:analytics:view" compact />;
  }

  if (overviewQuery.access.pending || overviewQuery.isLoading) {
    return <ResultsSkeleton />;
  }

  if (overviewQuery.isError || !overview) {
    return (
      <ErrorState
        title="Couldn't load results"
        description={getErrorMessage(overviewQuery.error)}
        onRetry={handleRetryOverview}
      />
    );
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
    <div className="flex flex-col gap-4">
      <OverviewStats overview={overview} />

      {canUseAi && (
        <div className="flex justify-end">
          <AiActionsMenu actions={aiActions} triggerLabel="Summarize" menuLabel="Survey AI" align="end" />
        </div>
      )}

      {survey.mode === "assessment" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Assessment</h3>
          <AssessmentResultsCard surveyId={survey.id} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Question analytics</h3>
        {questionsQuery.access.pending || questionsQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : questionsQuery.isError ? (
          <ErrorState
            compact
            title="Couldn't load question analytics"
            description={getErrorMessage(questionsQuery.error)}
            onRetry={handleRetryQuestions}
          />
        ) : !questionAnalytics || questionAnalytics.length === 0 ? (
          <EmptyState
            compact
            title="No question analytics yet"
            description="Answers are counted per question as responses are submitted."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {questionAnalytics.map((analytics) => (
              <QuestionAnalyticsCard key={analytics.questionId} analytics={analytics} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Responses</h3>
        <ResponseTable surveyId={survey.id} />
      </div>
    </div>
  );
}
