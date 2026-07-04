"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurveyResponse, type SurveyResponseAnswer } from "@/hooks/api/surveys/analytics";

interface ResponseDetailSheetProps {
  surveyId: number;
  sessionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatAnswer(answer: SurveyResponseAnswer): string {
  if (answer.choiceIds?.length) {
    const choices = answer.question?.choices ?? [];
    const labels = answer.choiceIds.map((id) => choices.find((c) => c.id === id)?.label ?? `#${id}`);
    return labels.join(", ");
  }
  if (answer.answerText) return answer.answerText;
  if (answer.answerValue !== null && answer.answerValue !== undefined) return String(answer.answerValue);
  return "—";
}

export function ResponseDetailSheet({ surveyId, sessionId, open, onOpenChange }: ResponseDetailSheetProps) {
  const { data, isLoading } = useSurveyResponse(surveyId, sessionId ?? undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Response detail</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4 py-2">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : data ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={data.session.status === "submitted" ? "default" : "secondary"}>{data.session.status}</Badge>
                {data.session.anonymous && <Badge variant="outline">Anonymous</Badge>}
                {data.session.score !== null && <span>Score: {data.session.score}</span>}
                {data.session.submittedAt && <span>{new Date(data.session.submittedAt).toLocaleString()}</span>}
              </div>
              <div className="space-y-3">
                {data.answers.map((answer) => (
                  <div key={answer.id} className="space-y-1">
                    <p className="text-xs font-medium text-foreground">{answer.question?.title ?? `Question ${answer.questionId}`}</p>
                    <p className="text-sm text-muted-foreground">{formatAnswer(answer)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Response not found.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
