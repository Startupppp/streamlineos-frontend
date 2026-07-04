"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { usePublicSurvey, useStartSurveySession, useSaveSurveyAnswers, useSubmitSurveySession } from "@/hooks/api/surveys/public-runtime";
import type { AnswerValue } from "@/features/surveys/respondent/answer-value";
import { WelcomeScreen } from "@/features/surveys/respondent/welcome-screen";
import { RuntimeFlow } from "@/features/surveys/respondent/runtime-flow";
import { ThankYouScreen } from "@/features/surveys/respondent/thank-you-screen";

interface SurveyMessages {
  welcomeMessage?: string;
  thankYouMessage?: string;
  disqualificationMessage?: string;
}

type Phase = "welcome" | "running" | "done";

export default function PublicSurveyPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const surveyQuery = usePublicSurvey(token);
  const startSession = useStartSurveySession(token);
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);
  const saveAnswers = useSaveSurveyAnswers(token, sessionId);
  const submitSession = useSubmitSurveySession(token, sessionId);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [outcome, setOutcome] = useState<"completed" | "disqualified">("completed");
  const [result, setResult] = useState<{ score: number | null; passed: boolean | null } | null>(null);

  const data = surveyQuery.data;
  const messages = (data?.survey.settings.messages as SurveyMessages | undefined) ?? {};
  const questionCount = data?.schema?.sections.reduce((sum, s) => sum + s.questions.length, 0) ?? 0;

  async function handleStart() {
    try {
      const session = await startSession.mutateAsync({});
      setSessionId(session.id);
      setPhase("running");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function handleSaveAnswer(questionId: number, answer: AnswerValue) {
    await saveAnswers.mutateAsync([{ questionId, ...answer }]);
  }

  async function handleFinish(finishOutcome: "completed" | "disqualified") {
    try {
      const submitted = await submitSession.mutateAsync(undefined);
      setResult({ score: submitted.score, passed: submitted.passed });
    } catch (error) {
      toast.error(getApiError(error));
    }
    setOutcome(finishOutcome);
    setPhase("done");
  }

  return (
    <main className="min-h-screen surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">{data?.survey.title ?? "Survey"}</h1>
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {surveyQuery.isLoading && (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          )}

          {surveyQuery.isError && (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold text-foreground">Survey unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This survey is not currently accepting responses, or the link is invalid.
              </p>
            </div>
          )}

          {surveyQuery.isSuccess && data && phase === "welcome" && (
            <WelcomeScreen
              title={data.survey.title}
              description={data.survey.description}
              welcomeMessage={messages.welcomeMessage}
              questionCount={questionCount}
              onStart={handleStart}
              isStarting={startSession.isPending}
            />
          )}

          {phase === "running" && data?.schema && (
            <RuntimeFlow
              sections={data.schema.sections}
              logicRules={data.schema.logicRules}
              onSaveAnswer={handleSaveAnswer}
              onFinish={handleFinish}
            />
          )}

          {phase === "done" && (
            <ThankYouScreen
              outcome={outcome}
              thankYouMessage={messages.thankYouMessage}
              disqualificationMessage={messages.disqualificationMessage}
              isAssessment={data?.survey.mode === "assessment"}
              score={result?.score ?? null}
              passed={result?.passed ?? null}
            />
          )}
        </Card>
      </div>
    </main>
  );
}
