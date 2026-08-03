import type { AiActionResult } from "@/components/ai";
import type {
  TicketCommentsSummaryResult,
  TicketSummaryResult,
} from "@/hooks/api/build/ticket-ai";
import type { TicketHandoffResult } from "@/types/projects/ai";

export function getPlainText(value: string | null | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function formatTicketSummary(data: TicketSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.keyPoints.length > 0) {
    lines.push("", "Key points:");
    for (const point of data.keyPoints) lines.push(`• ${point}`);
  }
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const blocker of data.blockers) lines.push(`• ${blocker}`);
  }
  return { text: lines.join("\n").trimEnd() };
}

export function formatCommentsSummary(data: TicketCommentsSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.themes.length > 0) {
    lines.push("", "Themes:");
    for (const theme of data.themes) lines.push(`• ${theme}`);
  }
  if (data.openQuestions.length > 0) {
    lines.push("", "Open questions:");
    for (const question of data.openQuestions) lines.push(`• ${question}`);
  }
  return { text: lines.join("\n").trimEnd() };
}

export function formatHandoff(data: TicketHandoffResult): AiActionResult {
  const lines: string[] = [data.currentState];
  if (data.keyDecisions.length > 0) {
    lines.push("", "Key decisions:");
    for (const decision of data.keyDecisions) lines.push(`• ${decision}`);
  }
  lines.push("", `Next action: ${data.nextAction}`);
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const blocker of data.blockers) lines.push(`• ${blocker}`);
  }
  const citations = data.citations.map((citation, index) => ({
    id: index,
    title: citation.excerpt,
  }));
  return {
    text: lines.join("\n").trimEnd(),
    citations: citations.length > 0 ? citations : undefined,
  };
}
