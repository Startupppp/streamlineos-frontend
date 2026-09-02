"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import {
  useAIScoreCandidate,
  useAIInterviewKit,
  useAIInterviewNotesSummary,
} from "@/hooks/api/ai";
import type { AiAction } from "@/components/ai";

interface UseCandidateAiActionsParams {
  candidateId: number;
  firstJobPostingId?: number;
}

export function useCandidateAiActions({ candidateId, firstJobPostingId }: UseCandidateAiActionsParams): AiAction[] {
  const canManage = useCan("hr:employees:manage");
  const scoreCandidateMutation = useAIScoreCandidate();
  const interviewKitMutation = useAIInterviewKit();
  const interviewNotesSummaryMutation = useAIInterviewNotesSummary();

  return useMemo<AiAction[]>(() => {
    if (!canManage) return [];
    return [
      {
        key: "fit-estimate",
        label: "AI fit estimate (advisory)",
        description: "AI-estimated candidate fit score — requires human review",
        run: async (signal?: AbortSignal) => {
          const result = await scoreCandidateMutation.mutateAsync({ candidateId, signal });
          return {
            text: `Fit score: ${result.score}/100 (${result.fitLevel})\n\nReasoning: ${result.reasoning}\n\nStrengths:\n${result.strengths.map((s) => "• " + s).join("\n")}\n\nConcerns:\n${result.concerns.map((c) => "• " + c).join("\n")}\n\nSuggested questions:\n${result.suggestedQuestions.map((q) => "• " + q).join("\n")}\n\n⚠ Advisory only. This AI estimate must not be used to automatically accept or reject candidates — human decision required.`,
          };
        },
      },
      {
        key: "interview-kit",
        label: "Interview kit",
        description: "Generate structured interview questions and rubric",
        run: async (signal?: AbortSignal) => {
          const jobPostingId = firstJobPostingId ?? candidateId;
          const result = await interviewKitMutation.mutateAsync({ jobPostingId, signal });
          const body = result.roundKits.map((kit) => `## ${kit.round}\n${kit.questions.map((q) => `Q: ${q.question}\nCategory: ${q.category}\nExpected: ${q.expectedAnswer}`).join("\n\n")}`).join("\n\n---\n\n");
          return { text: body + (result.disclaimer ? `\n\n⚠ ${result.disclaimer}` : "") };
        },
      },
      {
        key: "interview-notes",
        label: "Summarize interview notes",
        description: "Distill all interview notes into a recommendation",
        run: async (signal?: AbortSignal) => {
          const result = await interviewNotesSummaryMutation.mutateAsync({
            candidateId,
            signal,
          });
          const body = `Recommendation: ${result.overallRecommendation}\nConfidence: ${result.confidence}\n\nStrengths: ${result.strengthsSummary}\n\nConcerns: ${result.concernsSummary}\n\nSuggested next step: ${result.suggestedNextStep}`;
          return { text: body + (result.disclaimer ? `\n\n⚠ ${result.disclaimer}` : "") };
        },
      },
    ];
  }, [canManage, candidateId, firstJobPostingId, scoreCandidateMutation, interviewKitMutation, interviewNotesSummaryMutation]);
}
