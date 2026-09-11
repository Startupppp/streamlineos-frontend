import {
  parseMeetingAgendaStream,
  hasAgendaContent,
} from "./meeting-prep-stream-parse";

/**
 * The panel calls this on every token, so the contract that matters is not
 * "parses the finished answer" — it is "every prefix of the finished answer
 * parses into something renderable, and no prefix renders a lie".
 */
const ANSWER = [
  "## Agenda",
  "- 09:00 Opening and context (5 min)",
  "- 09:05 Q3 pipeline review (20 min)",
  "",
  "## Key topics",
  "- Pipeline health",
  "- Renewal risk",
  "- Headcount plan",
  "",
  "## Suggested duration",
  "45 minutes",
  "",
  "## Preparation notes",
  "Bring the latest pipeline export.",
  "",
].join("\n");

describe("parseMeetingAgendaStream — the finished answer", () => {
  const sections = parseMeetingAgendaStream(ANSWER);

  it("splits the four sections the stream prompt asks for", () => {
    expect(sections.agenda).toBe(
      "- 09:00 Opening and context (5 min)\n- 09:05 Q3 pipeline review (20 min)",
    );
    expect(sections.keyTopics).toEqual([
      "Pipeline health",
      "Renewal risk",
      "Headcount plan",
    ]);
    expect(sections.suggestedDuration).toBe("45 minutes");
    expect(sections.preparationNotes).toBe("Bring the latest pipeline export.");
  });

  it("keeps no heading marker in any rendered section", () => {
    expect(sections.agenda).not.toContain("#");
    expect(sections.preparationNotes).not.toContain("#");
    expect(sections.keyTopics.join(" ")).not.toContain("#");
  });
});

describe("parseMeetingAgendaStream — every prefix", () => {
  it("never leaks a half-typed heading into the previous section's prose", () => {
    for (let i = 1; i <= ANSWER.length; i += 1) {
      const sections = parseMeetingAgendaStream(ANSWER.slice(0, i));
      expect(sections.agenda).not.toMatch(/#/);
      expect(sections.agenda).not.toMatch(/Key topics/);
      expect(sections.agenda).not.toMatch(/Suggested duration/);
      expect(sections.agenda).not.toMatch(/Preparation notes/);
    }
  });

  it("only ever grows a section, never rewrites one it already showed", () => {
    let previousAgenda = "";
    let previousTopics = 0;
    for (let i = 1; i <= ANSWER.length; i += 1) {
      const sections = parseMeetingAgendaStream(ANSWER.slice(0, i));
      if (previousAgenda && sections.agenda)
        expect(sections.agenda.startsWith(previousAgenda)).toBe(true);
      if (sections.agenda) previousAgenda = sections.agenda;
      expect(sections.keyTopics.length).toBeGreaterThanOrEqual(previousTopics);
      previousTopics = sections.keyTopics.length;
    }
    expect(previousTopics).toBe(3);
  });

  it("renders agenda prose before the second heading has arrived", () => {
    const partial = "## Agenda\n- 09:00 Opening and context (5 min)\n";
    const sections = parseMeetingAgendaStream(partial);
    expect(sections.agenda).toBe("- 09:00 Opening and context (5 min)");
    expect(sections.keyTopics).toEqual([]);
    expect(hasAgendaContent(sections)).toBe(true);
  });

  it("shows the trailing partial sentence rather than withholding it", () => {
    const sections = parseMeetingAgendaStream("## Agenda\n- 09:00 Openi");
    expect(sections.agenda).toBe("- 09:00 Openi");
  });

  it("reports nothing renderable for the empty stream", () => {
    expect(hasAgendaContent(parseMeetingAgendaStream(""))).toBe(false);
  });
});

describe("parseMeetingAgendaStream — models that do not follow the prompt", () => {
  it("treats an answer with no headings at all as agenda prose", () => {
    const sections = parseMeetingAgendaStream("Just talk about the renewal.");
    expect(sections.agenda).toBe("Just talk about the renewal.");
    expect(hasAgendaContent(sections)).toBe(true);
  });

  it("accepts bold headings, numbered topics and a colon after the title", () => {
    const sections = parseMeetingAgendaStream(
      ["**Agenda**", "Opening.", "**Key Topics:**", "1. Budget", "2) Timeline", ""].join("\n"),
    );
    expect(sections.agenda).toBe("Opening.");
    expect(sections.keyTopics).toEqual(["Budget", "Timeline"]);
  });

  it("keeps an unrecognised section rather than dropping its text", () => {
    const sections = parseMeetingAgendaStream(
      ["## Agenda", "Opening.", "## Risks", "Renewal may slip.", ""].join("\n"),
    );
    expect(sections.agenda).toContain("Opening.");
    expect(sections.agenda).toContain("Renewal may slip.");
  });

  it("does not repeat a topic the model listed twice", () => {
    const sections = parseMeetingAgendaStream(
      ["## Key topics", "- Budget", "- Budget", ""].join("\n"),
    );
    expect(sections.keyTopics).toEqual(["Budget"]);
  });
});
