"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getApiError } from "@/lib/api-client";
import type { PublicSurveySection, PublicSurveyLogicRule } from "@/hooks/api/surveys/public-runtime";
import type { AnswerValue } from "./answer-value";
import { QuestionInput } from "./question-input";
import { evaluateQuestionLogic } from "./logic-evaluator";

interface RuntimeFlowProps {
  sections: PublicSurveySection[];
  logicRules: PublicSurveyLogicRule[];
  onSaveAnswer: (questionId: number, answer: AnswerValue) => Promise<void>;
  onFinish: (outcome: "completed" | "disqualified") => void;
}

export function RuntimeFlow({ sections, logicRules, onSaveAnswer, onFinish }: RuntimeFlowProps) {
  const orderedQuestions = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedSections.flatMap((section) =>
      [...section.questions].sort((a, b) => a.sortOrder - b.sortOrder).map((q) => ({ ...q, sectionId: section.id })),
    );
  }, [sections]);

  const [currentId, setCurrentId] = useState<number | undefined>(orderedQuestions[0]?.id);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [saving, setSaving] = useState(false);

  const currentIndex = orderedQuestions.findIndex((q) => q.id === currentId);
  const current = orderedQuestions[currentIndex];
  const progress = orderedQuestions.length > 0 ? Math.round((currentIndex / orderedQuestions.length) * 100) : 0;

  const cumulativeScore = useMemo(() => {
    let total = 0;
    for (const q of orderedQuestions) {
      const answer = answers[q.id];
      if (answer?.choiceIds?.length) {
        for (const choiceId of answer.choiceIds) {
          total += q.choices.find((c) => c.id === choiceId)?.score ?? 0;
        }
      }
    }
    return total;
  }, [orderedQuestions, answers]);

  if (!current) {
    return null;
  }

  function handleAnswerChange(value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function findNextQuestionId(fromIndex: number, targetQuestionId: number | null, targetSectionId: number | null): number | undefined {
    if (targetQuestionId) return targetQuestionId;
    if (targetSectionId) {
      const firstInSection = orderedQuestions.find((q) => q.sectionId === targetSectionId);
      if (firstInSection) return firstInSection.id;
    }
    return orderedQuestions[fromIndex + 1]?.id;
  }

  async function handleNext() {
    const answer = answers[current.id];
    if (current.required && current.type !== "content_block") {
      const hasAnswer =
        (answer?.answerText && answer.answerText.trim().length > 0) ||
        answer?.answerValue !== undefined ||
        (answer?.choiceIds && answer.choiceIds.length > 0);
      if (!hasAnswer) {
        toast.error("This question is required");
        return;
      }
    }

    setSaving(true);
    try {
      if (current.type !== "content_block" && answer) {
        await onSaveAnswer(current.id, answer);
      }

      const outcome = evaluateQuestionLogic(current, answer, logicRules, cumulativeScore);
      if (outcome.disqualified) {
        onFinish("disqualified");
        return;
      }
      if (outcome.endSurvey) {
        onFinish("completed");
        return;
      }

      const nextId = findNextQuestionId(currentIndex, outcome.skipToQuestionId, outcome.skipToSectionId);
      if (nextId === undefined) {
        onFinish("completed");
      } else {
        setCurrentId(nextId);
      }
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Progress value={progress} className="h-1.5" />
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {current.title}
            {current.required && <span className="text-destructive"> *</span>}
          </h3>
          {current.description && <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>}
        </div>
        <QuestionInput question={current} value={answers[current.id]} onChange={handleAnswerChange} />
      </div>
      <Button onClick={handleNext} disabled={saving} className="w-full h-11">
        {currentIndex === orderedQuestions.length - 1 ? "Submit" : "Next"}
      </Button>
    </div>
  );
}
