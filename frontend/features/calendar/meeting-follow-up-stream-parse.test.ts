import {
  parseFollowUpStream,
  hasFollowUpContent,
  isSendableFollowUp,
} from "./meeting-follow-up-stream-parse";

/**
 * The parser is a pure function of the text received SO FAR, so the tests feed
 * it prefixes as well as whole answers. A parser that only works on a complete
 * document renders nothing until the last token and defeats the point of
 * streaming.
 */

const WHOLE = [
  "## Subject",
  "Follow-up: Q3 pipeline review",
  "",
  "## Email",
  "Thanks everyone for joining.",
  "",
  "We agreed to ship the pilot in October.",
  "",
  "## Action items",
  "- Draft the migration plan | owner: Priya | due: 2026-09-12",
  "- Book the follow-up review | owner: unassigned | due: none",
  "",
  "## Next meeting",
  "2026-09-19",
  "",
].join("\n");

describe("parseFollowUpStream", () => {
  it("folds the whole answer back into the draft the panel renders and sends", () => {
    expect(parseFollowUpStream(WHOLE)).toEqual({
      subject: "Follow-up: Q3 pipeline review",
      body: "Thanks everyone for joining.\n\nWe agreed to ship the pilot in October.",
      actionItems: [
        { item: "Draft the migration plan", assignee: "Priya", dueDate: "2026-09-12" },
        { item: "Book the follow-up review" },
      ],
      nextMeetingDate: "2026-09-19",
    });
  });

  it("returns each prefix's own draft, so the panel renders as the answer arrives", () => {
    const prefixes = [
      "## Subject\nFollow-up: Q3",
      "## Subject\nFollow-up: Q3 pipeline review\n\n## Email\nThanks",
    ];

    expect(parseFollowUpStream(prefixes[0] ?? "").subject).toBe("Follow-up: Q3");
    const second = parseFollowUpStream(prefixes[1] ?? "");
    expect(second.subject).toBe("Follow-up: Q3 pipeline review");
    expect(second.body).toBe("Thanks");
    expect(second.actionItems).toEqual([]);
  });

  it("withholds a half-arrived heading rather than flashing it into the previous section", () => {
    const draft = parseFollowUpStream("## Subject\nFollow-up: Q3 pipeline review\n## Ema");

    expect(draft.subject).toBe("Follow-up: Q3 pipeline review");
    expect(draft.subject).not.toContain("Ema");
  });

  it("never renders a bare bullet marker as an action item", () => {
    const draft = parseFollowUpStream("## Action items\n- ");

    expect(draft.actionItems).toEqual([]);
  });

  it("reads owner and due by label, so a half-arrived item still refines in place", () => {
    const partial = parseFollowUpStream("## Action items\n- Draft the plan | owner: Pri\n");

    expect(partial.actionItems).toEqual([{ item: "Draft the plan", assignee: "Pri" }]);
  });

  it("treats the model's placeholders as absent rather than as an owner named 'unassigned'", () => {
    const draft = parseFollowUpStream(
      "## Action items\n- Do the thing | owner: unassigned | due: N/A\n\n## Next meeting\nnone\n",
    );

    expect(draft.actionItems).toEqual([{ item: "Do the thing" }]);
    expect(draft.nextMeetingDate).toBeUndefined();
  });

  it("accepts a bold heading, which models emit instead of ## often enough to matter", () => {
    const draft = parseFollowUpStream("**Subject**\nQuarterly recap\n\n**Email**\nHello.\n");

    expect(draft.subject).toBe("Quarterly recap");
    expect(draft.body).toBe("Hello.");
  });

  it("reports emptiness honestly, so the panel shows a skeleton and not an empty card", () => {
    expect(hasFollowUpContent(parseFollowUpStream(""))).toBe(false);
    expect(hasFollowUpContent(parseFollowUpStream("## Subject\nRecap\n"))).toBe(true);
  });
});

describe("isSendableFollowUp", () => {
  it("refuses a draft the propose-send body would reject", () => {
    expect(isSendableFollowUp(parseFollowUpStream("## Subject\nRecap\n"))).toBe(false);
    expect(isSendableFollowUp(parseFollowUpStream("## Email\nHello.\n"))).toBe(false);
  });

  it("allows a draft that carries both a subject and a body", () => {
    expect(isSendableFollowUp(parseFollowUpStream(WHOLE))).toBe(true);
  });
});
