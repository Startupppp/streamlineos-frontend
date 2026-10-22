
export interface MeetingAgendaSections {
  agenda: string;
  keyTopics: string[];
  suggestedDuration: string;
  preparationNotes: string;
}

type SectionKey = keyof MeetingAgendaSections;

const HEADING = /^\s{0,3}#{1,6}\s*(.+?)\s*$/;
const BOLD_HEADING = /^\s{0,3}\*\*(.+?)\*\*\s*:?\s*$/;
const BULLET = /^\s*(?:[-*+•]|\d+[.)])(?:\s+|$)/;

function couldBecomeHeading(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("*");
}

function sectionFor(title: string): SectionKey | null {
  const normalized = title.toLowerCase().replace(/[^a-z ]/g, " ");
  if (normalized.includes("agenda")) return "agenda";
  if (normalized.includes("topic")) return "keyTopics";
  if (normalized.includes("duration")) return "suggestedDuration";
  if (normalized.includes("prep") || normalized.includes("note")) return "preparationNotes";
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

function toTopic(line: string): string {
  return line.replace(BULLET, "").replace(/\*\*/g, "").trim();
}

export function parseMeetingAgendaStream(text: string): MeetingAgendaSections {
  const buckets: Record<SectionKey, string[]> = {
    agenda: [],
    keyTopics: [],
    suggestedDuration: [],
    preparationNotes: [],
  };

  let current: SectionKey = "agenda";

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

  const topics: string[] = [];
  for (const line of buckets.keyTopics) {
    const topic = toTopic(line);
    if (topic && !topics.includes(topic)) topics.push(topic);
  }

  return {
    agenda: buckets.agenda.join("\n").trim(),
    keyTopics: topics,
    suggestedDuration: buckets.suggestedDuration
      .map(toTopic)
      .filter((line) => line.length > 0)
      .join(" ")
      .trim(),
    preparationNotes: buckets.preparationNotes.join("\n").trim(),
  };
}

export function hasAgendaContent(sections: MeetingAgendaSections): boolean {
  return (
    sections.agenda.length > 0 ||
    sections.keyTopics.length > 0 ||
    sections.suggestedDuration.length > 0 ||
    sections.preparationNotes.length > 0
  );
}
