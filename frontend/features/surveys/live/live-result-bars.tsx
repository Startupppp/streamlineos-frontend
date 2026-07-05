import type { LiveSessionResults } from "@/hooks/api/surveys/live-session";

const CHART_COLOR = "#3B82F6";

export function LiveResultBars({ results }: { results: LiveSessionResults }) {
  if (!results.question) {
    return <p className="text-sm text-muted-foreground">Waiting for the next question...</p>;
  }

  if (!results.revealed) {
    return (
      <p className="text-sm text-muted-foreground">
        {results.question.responseCount} response{results.question.responseCount === 1 ? "" : "s"} so far. Click Reveal to show results.
      </p>
    );
  }

  const total = results.question.choiceDistribution.reduce((sum, c) => sum + c.count, 0) || 1;
  return (
    <div className="space-y-2">
      {results.question.choiceDistribution.map((choice) => {
        const pct = Math.round((choice.count / total) * 100);
        return (
          <div key={choice.choiceId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{choice.label}{choice.isCorrect ? " ✓" : ""}</span>
              <span className="text-muted-foreground">{choice.count} ({pct}%)</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLOR }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
