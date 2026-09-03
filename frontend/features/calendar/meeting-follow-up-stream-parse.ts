import type { ActionItem, FollowUpDraft } from "@/hooks/api/meetings-ai";

/**
 * `POST /ai/meetings/follow-up/stream` answers in raw UTF-8 text deltas, and the
 * prompt behind it (`followUpStreamPrompt`) asks for markdown with four `##`
 * sections in a fixed order: Subject, Email, Action items, Next meeting. The
 * panel renders those four as a structured draft AND has to hand the same draft
 * to `POST /ai/meetings/follow-up/propose-send`, so the stream is folded back
 * into a `FollowUpDraft` on every token rather than once at the end.
 *
 * Everything here is a pure function of the text received so far. Called with a
 * prefix it returns that prefix's draft; called with the whole answer it returns
 * the whole answer's. That is what lets the panel render structure while the
 * answer is still arriving, and still send what it has when the user stops
 * halfway.
 */

type SectionKey = "subject" | "body" | "actionItems" | "nextMeetingDate";

const HEADING = /^\s{0,3}#{1,6}\s*(.+?)\s*$/;
const BOLD_HEADING = /^\s{0,3}\*\*(.+?)\*\*\s*:?\s*$/;
/**
 * The trailing `(?:\s+|$)` is load-bearing. A bullet marker arrives before its
 * text, so `- ` exists for a frame; without it the marker survives stripping and
 * renders as an action item reading "-" that then vanishes.
 */
const BULLET = /^\s*(?:[-*+•]|\d+[.)])(?:\s+|$)/;
const EMPTY_FIELD = /^(?:none|n\/?a|unassigned|tbd|not specified|-|—)$/i;

/**
 * A heading arrives one token at a time, so `## Action it` exists for a frame.
 * Rendered as body text it would flash the next section's title into the
 * previous section's prose. An incomplete trailing line that could still become
 * a heading is therefore withheld until its newline arrives.
 */
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

/**
 * `- <task> | owner: <name> | due: <date>`. Reading the labels rather than the
 * positions is what survives a half-arrived line: while `| owner: Pri` is on the
 * wire there is a task and a partial owner, and both refine on the next token
 * instead of the whole item waiting for its newline.
 */
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

/**
 * The send flow posts the draft to `propose-send`, whose Zod body requires a
 * subject and a body. A stream stopped before the email arrived has neither, so
 * offering "Send via Calendar" there would spend a click on a guaranteed 400.
 */
export function isSendableFollowUp(draft: FollowUpDraft): boolean {
  return draft.subject.length > 0 && draft.body.length > 0;
}
