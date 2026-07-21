import type { AiAction } from "@/components/ai";
import type { MailMessageDetail } from "@/types/mail";

export interface MailReplyParams {
  accountId: number;
  toEmail: string;
  subject: string;
  threadId?: string;
  messageId: string;
  prefillBody?: string;
}

interface ThreadSummaryResult {
  summary: string;
  actionItems: string[];
  suggestedReply: string;
}

interface DraftResult {
  subject: string;
  bodyHtml: string;
}

interface BuildMailAiActionsParams {
  threadId: string;
  accountId: number;
  subject: string;
  latestMessage: MailMessageDetail | undefined;
  onReply: (params: MailReplyParams) => void;
  summarize: (params: {
    accountId: number;
    threadId: string;
  }) => Promise<ThreadSummaryResult>;
  draft: (params: {
    mode: "reply";
    instruction: string;
    accountId: number;
    threadId: string;
  }) => Promise<DraftResult>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMailReadingAiActions(
  params: BuildMailAiActionsParams,
): AiAction[] {
  const {
    threadId,
    accountId,
    subject,
    latestMessage,
    onReply,
    summarize,
    draft,
  } = params;

  function applyDraftReply(text: string) {
    if (!latestMessage) return;
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    onReply({
      accountId,
      toEmail: latestMessage.from.email,
      subject: replySubject,
      threadId,
      messageId: latestMessage.id,
      prefillBody: text,
    });
  }

  async function runThreadSummary() {
    const data = await summarize({ accountId, threadId });
    const parts = [
      data.summary,
      data.actionItems.length
        ? "Action items:\n" +
          data.actionItems.map((item) => `• ${item}`).join("\n")
        : "",
      data.suggestedReply ? `Suggested reply:\n${data.suggestedReply}` : "",
    ].filter(Boolean);
    return { text: parts.join("\n\n") };
  }

  async function runExtractActions() {
    const data = await summarize({ accountId, threadId });
    if (data.actionItems.length === 0) {
      return {
        text: data.summary || "No clear action items in this thread.",
      };
    }
    return {
      text: data.actionItems.map((item) => `• ${item}`).join("\n"),
    };
  }

  async function runDraftReply() {
    const data = await draft({
      mode: "reply",
      instruction:
        "Write a professional, concise reply to this email thread. Acknowledge the ask and propose a clear next step.",
      accountId,
      threadId,
    });
    return { text: data.bodyHtml };
  }

  async function runSuggestedReply() {
    const data = await summarize({ accountId, threadId });
    const reply =
      data.suggestedReply.trim() ||
      "Thanks for your note — I'll follow up shortly.";
    const safe = escapeHtml(reply).replace(/\n/g, "<br/>");
    return { text: `<p>${safe}</p>` };
  }

  return [
    {
      key: "thread-summary",
      label: "Summarize thread",
      description: "Brief + action items",
      run: runThreadSummary,
    },
    {
      key: "extract-actions",
      label: "Extract actions",
      description: "Only the to-dos",
      run: runExtractActions,
    },
    {
      key: "draft-reply",
      label: "Draft reply",
      description: "Full AI reply draft",
      run: runDraftReply,
      onApply: applyDraftReply,
      applyLabel: "Open in composer",
    },
    {
      key: "suggested-reply",
      label: "Quick reply draft",
      description: "Short suggested reply",
      run: runSuggestedReply,
      onApply: applyDraftReply,
      applyLabel: "Open in composer",
    },
  ];
}
