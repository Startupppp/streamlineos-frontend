"use client";

import { useMemo } from "react";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import {
  useAccountSummaryWithCitations,
  useCrmEmailDraft,
} from "@/hooks/api/crm/ai";
import { useNextBestAction } from "@/hooks/api/ai";

interface ContactInlineAiMenuProps {
  contactId: number;
  contactName: string;
  contactEmail?: string | null;
  onDraftEmail?: (subject: string, body: string) => void;
}

export function ContactInlineAiMenu({
  contactId,
  onDraftEmail,
}: ContactInlineAiMenuProps) {
  const canUse = useCan("crm:ai:use");
  const emailDraftMutation = useCrmEmailDraft();
  const nextActionMutation = useNextBestAction();

  const actions = useMemo<AiAction[]>(() => {
    async function runEmailDraft(signal?: AbortSignal) {
      const data = await emailDraftMutation.mutateAsync({
        entityType: "lead",
        entityId: contactId,
        intent: "outreach",
        tone: "formal",
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

    async function runNextAction(signal?: AbortSignal) {
      const data = await nextActionMutation.mutateAsync({ leadId: contactId, signal });
      return {
        text: [data.action, data.reasoning, data.template].filter(Boolean).join("\n\n"),
      };
    }

    return [
      {
        key: "email-draft",
        label: "Draft email",
        run: runEmailDraft,
        surface: "sheet",
        onApply: onDraftEmail ? applyEmailDraft : undefined,
        applyLabel: "Open in composer",
      },
      { key: "next-action", label: "Next best action", run: runNextAction },
    ];
  }, [contactId, emailDraftMutation, nextActionMutation, onDraftEmail]);

  if (!canUse) return null;

  return <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />;
}

interface AccountInlineAiMenuProps {
  clientId: number;
  clientName: string;
  onDraftEmail?: (subject: string, body: string) => void;
}

export function AccountInlineAiMenu({
  clientId,
  onDraftEmail,
}: AccountInlineAiMenuProps) {
  const canUse = useCan("crm:ai:use");
  const accountSummaryMutation = useAccountSummaryWithCitations();
  const emailDraftMutation = useCrmEmailDraft();

  const actions = useMemo<AiAction[]>(() => {
    async function runBrief(signal?: AbortSignal) {
      const data = await accountSummaryMutation.mutateAsync({ clientId, signal });
      return { text: data.summary, citations: data.citations };
    }

    async function runEmailDraft(signal?: AbortSignal) {
      const data = await emailDraftMutation.mutateAsync({
        entityType: "deal",
        entityId: clientId,
        intent: "client outreach",
        tone: "formal",
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

    return [
      { key: "brief", label: "Account brief", run: runBrief, expectsCitations: true },
      {
        key: "email-draft",
        label: "Draft email",
        run: runEmailDraft,
        surface: "sheet",
        onApply: onDraftEmail ? applyEmailDraft : undefined,
        applyLabel: "Open in composer",
      },
    ];
  }, [clientId, accountSummaryMutation, emailDraftMutation, onDraftEmail]);

  if (!canUse) return null;

  return <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />;
}
