import { isToday, isYesterday, parseISO } from "date-fns";
import type { MailMessageSummary } from "@/types/mail";

export type MailTriageGroupKey = "needs_you" | "today" | "earlier";

export interface MailTriageGroup {
  key: MailTriageGroupKey;
  label: string;
  messages: MailMessageSummary[];
}

const REPLY_HINT =
  /\b(please|asap|urgent|action required|rsvp|confirm|reply|respond|deadline|review|approve|feedback|question|can you|could you|need your|waiting on)\b/i;

const NOISE_HINT =
  /\b(newsletter|unsubscribe|noreply|no-reply|notification|receipt|invoice attached|digest|weekly update)\b/i;

export function scoreNeedsYou(message: MailMessageSummary): number {
  let score = 0;
  if (!message.isRead) score += 3;
  if (message.isStarred) score += 2;
  const haystack = `${message.subject} ${message.snippet}`;
  if (REPLY_HINT.test(haystack)) score += 3;
  if (NOISE_HINT.test(haystack) || NOISE_HINT.test(message.from.email)) score -= 2;
  if (message.hasAttachments && !message.isRead) score += 1;
  return score;
}

export function groupMailMessages(
  messages: MailMessageSummary[],
): MailTriageGroup[] {
  const needsYou: MailMessageSummary[] = [];
  const today: MailMessageSummary[] = [];
  const earlier: MailMessageSummary[] = [];

  for (const message of messages) {
    const date = parseISO(message.date);
    const needs = scoreNeedsYou(message) >= 4;
    if (needs) {
      needsYou.push(message);
    } else if (isToday(date) || isYesterday(date)) {
      today.push(message);
    } else {
      earlier.push(message);
    }
  }

  const groups: MailTriageGroup[] = [];
  if (needsYou.length > 0) {
    groups.push({
      key: "needs_you",
      label: "Needs you",
      messages: needsYou,
    });
  }
  if (today.length > 0) {
    groups.push({
      key: "today",
      label: "Today & yesterday",
      messages: today,
    });
  }
  if (earlier.length > 0) {
    groups.push({
      key: "earlier",
      label: "Earlier",
      messages: earlier,
    });
  }
  return groups;
}
