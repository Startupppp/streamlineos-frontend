"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiError } from "@/lib/api-client";
import { usePublicLiveSession, useJoinLiveSession, useSubmitLiveAnswer } from "@/hooks/api/surveys/live-session";
import type { AnswerValue } from "@/features/surveys/respondent/answer-value";
import { QuestionInput } from "@/features/surveys/respondent/question-input";

export default function LiveSessionJoinPage() {
  const params = useParams<{ sessionCode: string }>();
  const sessionCode = params.sessionCode;

  const sessionQuery = usePublicLiveSession(sessionCode);
  const join = useJoinLiveSession(sessionCode);
  const submitAnswer = useSubmitLiveAnswer(sessionCode);

  const [name, setName] = useState("");
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerValue | undefined>(undefined);
  const [answeredQuestionId, setAnsweredQuestionId] = useState<number | null>(null);

  const session = sessionQuery.data;
  const currentQuestion = session?.currentQuestion;

  const [prevQuestionId, setPrevQuestionId] = useState(currentQuestion?.id);
  if (currentQuestion?.id !== prevQuestionId) {
    setPrevQuestionId(currentQuestion?.id);
    setAnswer(undefined);
  }

  async function handleJoin() {
    try {
      const result = await join.mutateAsync({ name: name.trim() || undefined });
      setParticipantToken(result.participantToken);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function handleSubmitAnswer() {
    if (!participantToken || !currentQuestion || !answer) return;
    try {
      await submitAnswer.mutateAsync({
        participantToken,
        questionId: currentQuestion.id,
        answerValue: answer.answerValue,
        choiceIds: answer.choiceIds,
      });
      setAnsweredQuestionId(currentQuestion.id);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const hasAnsweredCurrent = currentQuestion && answeredQuestionId === currentQuestion.id;

  return (
    <main className="min-h-screen surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">Live Session</h1>
          <p className="text-white/80 text-sm mt-1">Code: {sessionCode}</p>
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {sessionQuery.isError && (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-foreground">Session unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">This live session has ended or the code is invalid.</p>
            </div>
          )}

          {sessionQuery.isSuccess && session && !participantToken && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your name to join (optional).</p>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              </div>
              <Button onClick={handleJoin} disabled={join.isPending} className="w-full h-11">
                Join
              </Button>
            </div>
          )}

          {participantToken && !currentQuestion && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Waiting for the host to start...</p>
            </div>
          )}

          {participantToken && currentQuestion && !hasAnsweredCurrent && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-foreground">{currentQuestion.title}</h3>
              <QuestionInput question={currentQuestion} value={answer} onChange={setAnswer} />
              <Button onClick={handleSubmitAnswer} disabled={!answer || submitAnswer.isPending} className="w-full h-11">
                Submit answer
              </Button>
            </div>
          )}

          {participantToken && currentQuestion && hasAnsweredCurrent && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Answer submitted. Waiting for the host...</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
