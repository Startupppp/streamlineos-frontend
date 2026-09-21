import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUESTION_TYPE_META, type SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";
import type { QuestionAnalytics } from "@/hooks/api/surveys/analytics";
import { AnonymitySuppressedNotice } from "@/components/shared/anonymity-suppressed-notice";

const CHART_COLOR = "#3B82F6";

function ChoiceDistributionBars({ analytics }: { analytics: QuestionAnalytics }) {
  const total = analytics.choiceDistribution.reduce((sum, c) => sum + c.count, 0) || 1;
  return (
    <div className="space-y-2">
      {analytics.choiceDistribution.map((choice) => {
        const pct = Math.round((choice.count / total) * 100);
        return (
          <div key={choice.choiceId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{choice.label}</span>
              <span className="text-muted-foreground">{choice.count} ({pct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: CHART_COLOR }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TextResponsesList({ responses }: { responses: (string | null)[] }) {
  const values = responses.filter((r): r is string => Boolean(r && r.trim()));
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">No text responses yet.</p>;
  }
  return (
    <div className="max-h-48 space-y-2 overflow-y-auto">
      {values.map((value, index) => (
        <p key={index} className="rounded-md bg-muted px-3 py-2 text-xs text-foreground">
          {value}
        </p>
      ))}
    </div>
  );
}

export function QuestionAnalyticsCard({ analytics }: { analytics: QuestionAnalytics }) {
  const meta = QUESTION_TYPE_META[analytics.type as SurveyQuestionType];
  const isTextType = analytics.type === "short_text" || analytics.type === "long_text";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{analytics.title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {meta?.label ?? analytics.type} &middot; {analytics.responseCount} response{analytics.responseCount === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent>
        {analytics.suppressed ? (
          <AnonymitySuppressedNotice minResponses={analytics.minResponses} />
        ) : analytics.choiceDistribution.length > 0 ? (
          <ChoiceDistributionBars analytics={analytics} />
        ) : isTextType ? (
          <TextResponsesList responses={analytics.textResponses ?? []} />
        ) : analytics.average !== null ? (
          <p className="text-2xl font-semibold text-foreground">{analytics.average.toFixed(1)}<span className="ml-1 text-sm font-normal text-muted-foreground">average</span></p>
        ) : (
          <p className="text-xs text-muted-foreground">No responses yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
