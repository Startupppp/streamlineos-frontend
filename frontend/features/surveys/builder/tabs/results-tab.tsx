"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

function QuestionAnalyticsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="survey-results-skeleton">
      <StatCardGridSkeleton cols={4} />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <QuestionAnalyticsCardSkeleton />
          <QuestionAnalyticsCardSkeleton />
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

  const awaitingOverview = overviewQuery.access.pending || overviewQuery.isLoading;
  const pageState = usePageState({
    permission: "surveys:analytics:view",
    isLoading: awaitingOverview,
    isError: overviewQuery.isError || (!awaitingOverview && overviewQuery.access.allowed && !overview),
    error: overviewQuery.error,
    isEmpty: (overview?.totalResponses ?? 0) === 0 && overview !== undefined,
  });

  return (
    <PageState
      resolution={pageState}
      loading={<ResultsSkeleton />}
      onRetry={handleRetryOverview}
      className="h-full min-h-0 flex-1"
      empty={
        <EmptyState
          illustrationPreset="chart"
          illustrationSize="lg"
          title="No responses yet"
          description="Results, question analytics, and exports will appear here once responses come in."
          className="h-full min-h-full flex-1"
        />
      }
    >
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-hide pr-3 pb-1">
      {overview ? <OverviewStats overview={overview} /> : null}

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
            <QuestionAnalyticsCardSkeleton />
            <QuestionAnalyticsCardSkeleton />
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
            title="No question analytics yet"
            description="Answers are counted per question as responses are submitted."
            className="h-full min-h-full flex-1"
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
    </PageState>
  );
}
