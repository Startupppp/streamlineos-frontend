"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getApiError } from "@/lib/api-client";
import type { PublicSurveySection, PublicSurveyLogicRule } from "@/hooks/api/surveys/public-runtime";
import type { AnswerValue } from "./answer-value";
import { QuestionInput } from "./question-input";
import { evaluateQuestionLogic } from "./logic-evaluator";

interface RuntimeFlowProps {
  surveyTitle: string;
  sections: PublicSurveySection[];
  logicRules: PublicSurveyLogicRule[];
  onSaveAnswer: (questionId: number, answer: AnswerValue) => Promise<void>;
  onFinish: (outcome: "completed" | "disqualified") => void;
}

export function RuntimeFlow({
  surveyTitle,
  sections,
  logicRules,
  onSaveAnswer,
  onFinish,
}: RuntimeFlowProps) {
  const orderedQuestions = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedSections.flatMap((section) =>
      [...section.questions]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((q) => ({ ...q, sectionId: section.id, sectionTitle: section.title })),
    );
  }, [sections]);

  const [currentId, setCurrentId] = useState<number | undefined>(orderedQuestions[0]?.id);
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  const currentIndex = orderedQuestions.findIndex((q) => q.id === currentId);
  const current = orderedQuestions[currentIndex];
  const progress =
    orderedQuestions.length > 0
      ? Math.round(((currentIndex + 1) / orderedQuestions.length) * 100)
      : 0;
  const isLast = currentIndex === orderedQuestions.length - 1;
  const isContentBlock = current?.type === "content_block";

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || saving) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      void handleNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, saving, answers]);

  if (!current) {
    return null;
  }

  function handleAnswerChange(value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function findNextQuestionId(
    fromIndex: number,
    targetQuestionId: number | null,
    targetSectionId: number | null,
  ): number | undefined {
    if (targetQuestionId) return targetQuestionId;
    if (targetSectionId) {
      const firstInSection = orderedQuestions.find((q) => q.sectionId === targetSectionId);
      if (firstInSection) return firstInSection.id;
    }
    return orderedQuestions[fromIndex + 1]?.id;
  }

  function goToQuestion(nextId: number, dir: 1 | -1) {
    setDirection(dir);
    if (dir > 0) {
      setHistory((prev) => [...prev, current.id]);
    }
    setCurrentId(nextId);
  }

  function handleBack() {
    if (history.length === 0) return;
    const prevId = history[history.length - 1];
    setDirection(-1);
    setHistory((prev) => prev.slice(0, -1));
    setCurrentId(prevId);
  }

  async function handleNext() {
    const answer = answers[current.id];
    if (current.required && !isContentBlock) {
      const hasAnswer =
        (answer?.answerText && answer.answerText.trim().length > 0) ||
        answer?.answerValue !== undefined ||
        (answer?.choiceIds && answer.choiceIds.length > 0);
      if (!hasAnswer) {
        toast.error("Please answer this question before continuing");
        return;
      }
    }

    setSaving(true);
    try {
      if (!isContentBlock && answer) {
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

      const nextId = findNextQuestionId(
        currentIndex,
        outcome.skipToQuestionId,
        outcome.skipToSectionId,
      );
      if (nextId === undefined) {
        onFinish("completed");
      } else {
        goToQuestion(nextId, 1);
      }
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {surveyTitle}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {currentIndex + 1} / {orderedQuestions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
              {current.title}
              {current.required && !isContentBlock ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </h2>
            {current.description && !isContentBlock ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{current.description}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-5 sm:px-5 sm:py-6">
            <QuestionInput
              question={current}
              value={answers[current.id]}
              onChange={handleAnswerChange}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="h-10 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
          disabled={saving || history.length === 0}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving}
          className="h-11 min-w-[140px] gap-2 font-medium sm:ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isLast ? (
            <>
              Submit
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Press Enter to continue
      </p>
    </div>
  );
}
