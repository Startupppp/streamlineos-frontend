"use client";

import { useMemo } from "react";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import {
  useLeadSummaryWithCitations,
  useDealSummaryWithCitations,
  useNextBestActionsAcrossPipeline,
  useCrmEmailDraft,
  useDuplicateSuggestions,
  useMeetingFollowUpDraft,
} from "@/hooks/api/crm/ai";
import { usePredictDeal, useNextBestAction } from "@/hooks/api/ai";

interface LeadInlineAiMenuProps {
  leadId: number;
  leadName: string;
  leadEmail?: string | null;
  onDraftEmail?: (subject: string, body: string) => void;
}

export function LeadInlineAiMenu({
  leadId,
  onDraftEmail,
}: LeadInlineAiMenuProps) {
  const canUse = useCan("crm:ai:use");
  const leadSummaryMutation = useLeadSummaryWithCitations();
  const nextActionMutation = useNextBestAction();
  const emailDraftMutation = useCrmEmailDraft();
  const duplicatesMutation = useDuplicateSuggestions();

  const actions = useMemo<AiAction[]>(() => {
    async function runSummary(signal?: AbortSignal) {
      const data = await leadSummaryMutation.mutateAsync({ leadId, signal });
      return {
        text: data.summary + "\n\nNext steps:\n" + data.nextBestActions.join("\n"),
        citations: data.citations,
      };
    }

    async function runNextAction(signal?: AbortSignal) {
      const data = await nextActionMutation.mutateAsync({ leadId, signal });
      return {
        text: [data.action, data.reasoning, data.template].filter(Boolean).join("\n\n"),
      };
    }

    async function runEmailDraft(signal?: AbortSignal) {
      const data = await emailDraftMutation.mutateAsync({
        entityType: "lead",
        entityId: leadId,
        intent: "outreach",
        tone: "friendly",
        signal,
      });
      return { text: "Subject: " + data.subject + "\n\n" + data.body };
    }

    function applyEmailDraft(text: string) {
      if (!onDraftEmail) return;
      const lines = text.split("\n\n");
      const subject = (lines[0] ?? "").replace(/^Subject:\s*/i, "");
      const body = lines.slice(1).join("\n\n");
      onDraftEmail(subject, body);
    }

    async function runDuplicates(signal?: AbortSignal) {
      const data = await duplicatesMutation.mutateAsync({ leadId, signal });
      const detail =
        data.duplicates.length > 0
          ? "\n\n" +
            data.duplicates
              .map(
                (d) =>
                  "Match (" +
                  (d.score * 100).toFixed(0) +
                  "% similar): " +
                  d.leads.map((l) => l.name).join(", ") +
                  "\nReasons: " +
                  d.matchReason.join(", "),
              )
              .join("\n\n")
          : "\n\nNo duplicates found.";
      return { text: data.aiExplanation + detail };
    }

    return [
      { key: "summary", label: "Lead summary", run: runSummary, expectsCitations: true },
      { key: "next-action", label: "Next best action", run: runNextAction },
      {
        key: "email-draft",
        label: "Draft outreach email",
        run: runEmailDraft,
        surface: "sheet",
        onApply: onDraftEmail ? applyEmailDraft : undefined,
        applyLabel: "Open in composer",
      },
      { key: "duplicates", label: "Find duplicates", run: runDuplicates },
    ];
  }, [leadId, leadSummaryMutation, nextActionMutation, emailDraftMutation, duplicatesMutation, onDraftEmail]);

  if (!canUse) return null;

  return <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />;
}

interface DealInlineAiMenuProps {
  dealId: number;
  dealName: string;
}

export function DealInlineAiMenu({ dealId, dealName }: DealInlineAiMenuProps) {
  const canUse = useCan("crm:ai:use");
  const dealSummaryMutation = useDealSummaryWithCitations();
  const nextBestActionsMutation = useNextBestActionsAcrossPipeline();
  const followUpMutation = useMeetingFollowUpDraft();
  const predictDealMutation = usePredictDeal();

  const actions = useMemo<AiAction[]>(() => {
    async function runBrief(signal?: AbortSignal) {
      const data = await dealSummaryMutation.mutateAsync({ dealId, signal });
      const parts = [
        data.summary,
        data.risks.length ? "Risks:\n" + data.risks.join("\n") : "",
        data.recommendedPlays.length ? "Plays:\n" + data.recommendedPlays.join("\n") : "",
        data.stakeholdersGap ? "Stakeholders gap: " + data.stakeholdersGap : "",
      ].filter(Boolean);
      return { text: parts.join("\n\n"), citations: data.citations };
    }

    async function runNextAction(signal?: AbortSignal) {
      const data = await nextBestActionsMutation.mutateAsync({ limit: 1, signal });
      const first = data.actions[0];
      if (!first) return { text: "No priority action identified." };
      return {
        text: [first.action, first.reasoning, first.rationale].filter(Boolean).join("\n\n"),
      };
    }

    async function runFollowUp(signal?: AbortSignal) {
      const data = await followUpMutation.mutateAsync({
        meetingTitle: "Meeting — " + dealName,
        attendeeType: "lead",
        attendeeId: dealId,
        outcome: "discussed deal progress",
        scheduledAt: new Date().toISOString(),
        signal,
      });
      return { text: data.draft };
    }

    async function runWinProbability(signal?: AbortSignal) {
      const data = await predictDealMutation.mutateAsync({ dealId, signal });
      const riskPart = data.riskFactors.length
        ? "\n\nRisk factors:\n" + data.riskFactors.join("\n")
        : "";
      const signalPart = data.positiveSignals.length
        ? "\n\nPositive signals:\n" + data.positiveSignals.join("\n")
        : "";
      return {
        text:
          "Win probability: ~" +
          data.winProbability +
          "% (" +
          data.confidence +
          " confidence)\n\n" +
          data.reasoning +
          "\n\n" +
          data.estimateDisclaimer +
          riskPart +
          signalPart,
        confidence: data.winProbability / 100,
      };
    }

    return [
      { key: "brief", label: "Deal brief", run: runBrief, expectsCitations: true },
      { key: "next-action", label: "Next best action", run: runNextAction },
      {
        key: "meeting-followup",
        label: "Meeting follow-up draft",
        run: runFollowUp,
        surface: "sheet",
      },
      {
        key: "win-probability",
        label: "Win-probability estimate (AI)",
        description: "An estimate with uncertainty — not a statistic",
        run: runWinProbability,
      },
    ];
  }, [dealId, dealName, dealSummaryMutation, nextBestActionsMutation, followUpMutation, predictDealMutation]);

  if (!canUse) return null;

  return <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />;
}

