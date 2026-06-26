"use client";

import { useCallback } from "react";
import {
  useAIScoreLead,
  useGenerateEmail,
  usePredictDeal,
  useNextBestAction,
  useObjectionHandler,
  useSentimentAnalysis,
  useAIScoreCandidate,
  useAIGenerateReview,
  useAISuggestHelpdeskReply,
  useAIAttritionRisk,
  useGenerateJobDescription,
  useMeetingPrep,
} from "@/lib/api/hooks/ai";

interface RunArgs {
  featureId: string;
  input: string;
  secondInput: string;
  onSuccess: (data: unknown) => void;
  onError: (err: Error) => void;
}

/**
 * Consolidates the 14 AI feature mutations behind a single dispatcher.
 * Keeps `isPending` derived from whichever underlying mutation is active.
 */
export function useAiFeatureMutation() {
  const scoreLead = useAIScoreLead();
  const generateEmail = useGenerateEmail();
  const predictDeal = usePredictDeal();
  const nextAction = useNextBestAction();
  const objectionHandler = useObjectionHandler();
  const sentiment = useSentimentAnalysis();
  const scoreCandidate = useAIScoreCandidate();
  const generateReview = useAIGenerateReview();
  const helpdeskReply = useAISuggestHelpdeskReply();
  const attritionRisk = useAIAttritionRisk();
  const generateJD = useGenerateJobDescription();
  const meetingPrep = useMeetingPrep();

  const isPending =
    scoreLead.isPending ||
    generateEmail.isPending ||
    predictDeal.isPending ||
    nextAction.isPending ||
    objectionHandler.isPending ||
    sentiment.isPending ||
    scoreCandidate.isPending ||
    generateReview.isPending ||
    helpdeskReply.isPending ||
    attritionRisk.isPending ||
    generateJD.isPending ||
    meetingPrep.isPending;

  const run = useCallback(
    ({ featureId, input, secondInput, onSuccess, onError }: RunArgs) => {
      const cb = { onSuccess, onError };
      switch (featureId) {
        case "score-lead":
          return scoreLead.mutate(Number(input), cb);
        case "generate-email":
          return generateEmail.mutate({ leadName: input, tone: "friendly" }, cb);
        case "predict-deal":
          return predictDeal.mutate(Number(input), cb);
        case "next-action":
          return nextAction.mutate(Number(input), cb);
        case "objection-handler":
          return objectionHandler.mutate(
            { objection: input, dealStage: secondInput || "PROPOSAL" },
            cb,
          );
        case "sentiment":
          return sentiment.mutate({ text: input }, cb);
        case "score-candidate":
          return scoreCandidate.mutate({ candidateId: Number(input) }, cb);
        case "generate-review":
          return generateReview.mutate(
            {
              userId: input,
              periodStart: "2026-01-01",
              periodEnd: "2026-03-31",
            },
            cb,
          );
        case "helpdesk-reply":
          return helpdeskReply.mutate(Number(input), cb);
        case "attrition-risk":
          return attritionRisk.mutate(input, cb);
        case "generate-jd":
          return generateJD.mutate(
            { title: input, location: secondInput || undefined },
            cb,
          );
        case "meeting-prep":
          return meetingPrep.mutate(
            {
              meetingTitle: input,
              attendeeType: "lead",
              attendeeId: Number(secondInput || "0"),
              scheduledAt: new Date().toISOString(),
            },
            cb,
          );
        default:
          onError(new Error("Feature not implemented"));
      }
    },
    [
      scoreLead,
      generateEmail,
      predictDeal,
      nextAction,
      objectionHandler,
      sentiment,
      scoreCandidate,
      generateReview,
      helpdeskReply,
      attritionRisk,
      generateJD,
      meetingPrep,
    ],
  );

  return { run, isPending };
}
