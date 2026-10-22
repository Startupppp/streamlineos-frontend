import type { ActionItem, FollowUpDraft } from "@/hooks/api/meetings-ai";


type SectionKey = "subject" | "body" | "actionItems" | "nextMeetingDate";

const HEADING = /^\s{0,3}#{1,6}\s*(.+?)\s*$/;
const BOLD_HEADING = /^\s{0,3}\*\*(.+?)\*\*\s*:?\s*$/;
const BULLET = /^\s*(?:[-*+•]|\d+[.)])(?:\s+|$)/;
const EMPTY_FIELD = /^(?:none|n\/?a|unassigned|tbd|not specified|-|—)$/i;

function couldBecomeHeading(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("*");
}

function sectionFor(title: string): SectionKey | null {
  const normalized = title.toLowerCase().replace(/[^a-z ]/g, " ");
  if (normalized.includes("subject")) return "subject";
  if (normalized.includes("action")) return "actionItems";
  if (normalized.includes("next")) return "nextMeetingDate";
  if (normalized.includes("email") || normalized.includes("body")) return "body";
  return null;
}

function headingTitle(line: string): string | null {
  const hash = HEADING.exec(line);
  if (hash?.[1]) return hash[1];
  const bold = BOLD_HEADING.exec(line);
  if (bold?.[1]) return bold[1];
  return null;
}

function usableLines(text: string): string[] {
  const lines = text.split("\n");
  if (text.endsWith("\n")) return lines;
  const last = lines[lines.length - 1];
  if (last !== undefined && couldBecomeHeading(last)) return lines.slice(0, -1);
  return lines;
}

function stripMarkers(line: string): string {
  return line.replace(BULLET, "").replace(/\*\*/g, "").trim();
}

function labelled(segment: string, label: string): string | null {
  const trimmed = segment.trim();
  const prefix = `${label}:`;
  if (!trimmed.toLowerCase().startsWith(prefix)) return null;
  const value = trimmed.slice(prefix.length).trim();
  if (!value || EMPTY_FIELD.test(value)) return null;
  return value;
}

function toActionItem(line: string): ActionItem | null {
  const [first, ...rest] = stripMarkers(line).split("|");
  const item = first?.trim() ?? "";
  if (!item) return null;

  const draft: ActionItem = { item };
  for (const segment of rest) {
    const assignee = labelled(segment, "owner") ?? labelled(segment, "assignee");
    if (assignee !== null) draft.assignee = assignee;
    const dueDate = labelled(segment, "due") ?? labelled(segment, "due date");
    if (dueDate !== null) draft.dueDate = dueDate;
  }
  return draft;
}

export function parseFollowUpStream(text: string): FollowUpDraft {
  const buckets: Record<SectionKey, string[]> = {
    subject: [],
    body: [],
    actionItems: [],
    nextMeetingDate: [],
  };

  let current: SectionKey = "subject";

  for (const line of usableLines(text)) {
    const title = headingTitle(line);
    if (title !== null) {
      const next = sectionFor(title);
      if (next !== null) {
        current = next;
        continue;
      }
    }
    buckets[current].push(line);
  }

  const actionItems: ActionItem[] = [];
  for (const line of buckets.actionItems) {
    const parsed = toActionItem(line);
    if (parsed) actionItems.push(parsed);
  }

  const nextMeetingDate = buckets.nextMeetingDate
    .map(stripMarkers)
    .filter((line) => line.length > 0)
    .join(" ")
    .trim();

  const draft: FollowUpDraft = {
    subject: buckets.subject.map(stripMarkers).filter(Boolean).join(" ").trim(),
    body: buckets.body.join("\n").trim(),
    actionItems,
  };
  if (nextMeetingDate && !EMPTY_FIELD.test(nextMeetingDate)) draft.nextMeetingDate = nextMeetingDate;
  return draft;
}

export function hasFollowUpContent(draft: FollowUpDraft): boolean {
  return (
    draft.subject.length > 0 ||
    draft.body.length > 0 ||
    draft.actionItems.length > 0 ||
    (draft.nextMeetingDate ?? "").length > 0
  );
}

export function isSendableFollowUp(draft: FollowUpDraft): boolean {
  return draft.subject.length > 0 && draft.body.length > 0;
}
