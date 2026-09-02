"use client";

import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { useSummarizeEnvelope } from "@/hooks/api/sign/ai";

const DISCLAIMER =
  "AI summary — read the full document before signing. This summary may not capture every legally binding clause.";

function buildSummaryText(summary: string): string {
  return `${summary}\n\n---\n${DISCLAIMER}`;
}

export function EnvelopeAiMenu({ envelopeId }: { envelopeId: number }) {
  const canView = useCan("sign:envelope:view");
  const summarize = useSummarizeEnvelope(envelopeId);

  if (!canView) return null;

  const actions: AiAction[] = [
    {
      key: "summarize",
      label: "Summarize this document",
      description: "Plain-language summary of key terms, obligations, and conditions",
      run: async (signal?: AbortSignal): Promise<AiActionResult> => {
        const result = await summarize.mutateAsync({ signal });
        return { text: buildSummaryText(result.summary) };
      },
    },
  ];

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI Summary"
      menuLabel="Document AI"
      align="end"
    />
  );
}
