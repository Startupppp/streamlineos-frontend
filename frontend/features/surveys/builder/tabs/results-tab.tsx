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
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { streamSurveyResponseSummary } from "@/hooks/api/surveys/survey-ai";

export function ResultsTab({ survey }: { survey: SurveyForm }) {
  const { data: overview, isLoading: overviewLoading, isError, refetch } = useAnalyticsOverview(survey.id);
  const { data: questionAnalytics, isLoading: questionsLoading } = useQuestionAnalytics(survey.id);
  const canUseAi = useCan("surveys:ai:use");
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

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Responses</h3>
        <ResponseTable surveyId={survey.id} />
      </div>
    </div>
  );
}
