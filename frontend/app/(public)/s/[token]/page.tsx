"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  usePublicSurvey,
  useStartSurveySession,
  useSaveSurveyAnswers,
  useSubmitSurveySession,
  type PublicSurveySection,
  type PublicSurveyLogicRule,
  type StartSessionResponse,
} from "@/hooks/api/surveys/public-runtime";
import type { AnswerValue } from "@/features/surveys/respondent/answer-value";
import { PublicSurveyShell } from "@/features/surveys/respondent/public-survey-shell";
import { WelcomeScreen } from "@/features/surveys/respondent/welcome-screen";
import { RuntimeFlow } from "@/features/surveys/respondent/runtime-flow";
import { ThankYouScreen } from "@/features/surveys/respondent/thank-you-screen";

interface SurveyMessages {
  welcomeMessage?: string;
  thankYouMessage?: string;
  disqualificationMessage?: string;
}

type Phase = "welcome" | "running" | "done";

type SchemaShape = { sections: PublicSurveySection[]; logicRules: PublicSurveyLogicRule[] };
type SessionWithScore = StartSessionResponse & { score: number | null; passed: boolean | null };

function isSchemaWithSections(schema: Record<string, unknown> | null | undefined): schema is SchemaShape {
  if (!schema) return false;
  return Array.isArray(schema["sections"]) && Array.isArray(schema["logicRules"]);
}

function hasScore(session: StartSessionResponse): session is SessionWithScore {
  return "score" in session;
}

function SurveyLoadingState() {
  return (
    <PublicSurveyShell>
      <div className="space-y-4">
        <Skeleton className="mx-auto h-11 w-11 rounded-xl" />
        <Skeleton className="mx-auto h-4 w-3/4" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </PublicSurveyShell>
  );
}

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
  const [result, setResult] = useState<{ score: number | null; passed: boolean | null } | null>(
    null,
  );

  const data = surveyQuery.data;
  const messages = (data?.survey.settings.messages as SurveyMessages | undefined) ?? {};
  const parsedSchema = isSchemaWithSections(data?.schema) ? data.schema : null;
  const questionCount = parsedSchema?.sections.reduce((sum, s) => sum + s.questions.length, 0) ?? 0;

  async function handleStart() {
    try {
      const session = await startSession.mutateAsync({});
      setSessionId(session.id);
      setPhase("running");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSaveAnswer(questionId: number, answer: AnswerValue) {
    await saveAnswers.mutateAsync([{ questionId, ...answer }]);
  }

  async function handleFinish(finishOutcome: "completed" | "disqualified") {
    try {
      const submitted = await submitSession.mutateAsync(undefined);
      setResult(hasScore(submitted) ? { score: submitted.score, passed: submitted.passed } : null);
      setOutcome(finishOutcome);
      setPhase("done");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (surveyQuery.isLoading) {
    return <SurveyLoadingState />;
  }

  if (surveyQuery.isError) {
    return (
      <PublicSurveyShell title="Survey unavailable">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          This survey is not currently accepting responses, or the link is invalid.
        </p>
      </PublicSurveyShell>
    );
  }

  if (!data) {
    return <SurveyLoadingState />;
  }

  if (phase === "welcome") {
    return (
      <PublicSurveyShell title={data.survey.title}>
        <WelcomeScreen
          description={data.survey.description}
          welcomeMessage={messages.welcomeMessage}
          questionCount={questionCount}
          onStart={handleStart}
          isStarting={startSession.isPending}
        />
      </PublicSurveyShell>
    );
  }

  if (phase === "running" && parsedSchema) {
    return (
      <PublicSurveyShell mode="form">
        <RuntimeFlow
          surveyTitle={data.survey.title}
          sections={parsedSchema.sections}
          logicRules={parsedSchema.logicRules}
          onSaveAnswer={handleSaveAnswer}
          onFinish={handleFinish}
        />
      </PublicSurveyShell>
    );
  }

  return (
    <PublicSurveyShell>
      <ThankYouScreen
        outcome={outcome}
        thankYouMessage={messages.thankYouMessage}
        disqualificationMessage={messages.disqualificationMessage}
        isAssessment={data.survey.mode === "assessment"}
        score={result?.score ?? null}
        passed={result?.passed ?? null}
      />
    </PublicSurveyShell>
  );
}
