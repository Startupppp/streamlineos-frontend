import { kbAskResultSchema } from "./ask-result-schema";
import { kbChatHistoryPageContract } from "./kb-chat-schema";

const document = { kind: "document", linkedDocumentId: 31, title: "Leave Policy", spaceId: null, updatedAt: "2026-09-01T00:00:00.000Z" };
const page = { kind: "page", pageId: 9, title: "Onboarding", spaceId: 1, updatedAt: "2026-09-01T00:00:00.000Z" };

describe("the answer contract", () => {
  const answer = (citations: unknown[]) => ({ answer: "You get twenty days.", citations, hasContext: true, conversationId: 5 });

  it("accepts a company document citation beside the ones that already existed", () => {
    const parsed = kbAskResultSchema.parse(answer([page, document]));

    expect(parsed.citations.map((citation) => citation.kind)).toEqual(["page", "document"]);
  });

  it("refuses a company document citation that claims to belong to a space, since it belongs to none", () => {
    expect(() => kbAskResultSchema.parse(answer([{ ...document, spaceId: 4 }]))).toThrow();
  });

  it("refuses a company document citation with no entry id, rather than a chip that goes nowhere", () => {
    const { linkedDocumentId: _omitted, ...withoutId } = document;

    expect(() => kbAskResultSchema.parse(answer([withoutId]))).toThrow();
  });
});

describe("the saved conversation contract", () => {
  it("accepts a company document citation on a saved assistant message", () => {
    const parsed = kbChatHistoryPageContract.parse({
      messages: [{ id: 1, role: "assistant", content: "You get twenty days.", citations: [document], createdAt: "2026-09-01T00:00:00.000Z" }],
      nextCursor: null,
    });

    expect(parsed.messages[0]?.citations?.[0]?.kind).toBe("document");
  });
});

describe("answer parts — six answer parts are accepted in the answer schema", () => {
  const baseAnswer = {
    answer: "You get twenty days.",
    citations: [page],
    hasContext: true,
    conversationId: 5,
  };

  it("accepts a disagreement summary alongside the answer, enabling the disagreement banner", () => {
    const parsed = kbAskResultSchema.parse({
      ...baseAnswer,
      disagreement: { summary: "Source A says 20 days but Source B says 15 days." },
    });

    expect(parsed.disagreement?.summary).toContain("Source A");
  });

  it("rejects a disagreement without a summary string, so the banner always has something to show", () => {
    expect(() =>
      kbAskResultSchema.parse({ ...baseAnswer, disagreement: { } }),
    ).toThrow();
  });

  it("accepts a passage on a page citation, enabling the source-passage part", () => {
    const citationWithPassage = { ...page, passage: "All employees receive 20 days of annual leave." };
    const parsed = kbAskResultSchema.parse({ ...baseAnswer, citations: [citationWithPassage] });

    expect(parsed.citations[0]).toMatchObject({ passage: "All employees receive 20 days of annual leave." });
  });

  it("accepts a verified flag on a citation, enabling the verification badge", () => {
    const citationVerified = { ...page, verified: true };
    const parsed = kbAskResultSchema.parse({ ...baseAnswer, citations: [citationVerified] });

    expect(parsed.citations[0]).toMatchObject({ verified: true });
  });

  it("accepts hasContext false as a first-class answer, not treated as missing data", () => {
    const noContextAnswer = { ...baseAnswer, citations: [], hasContext: false };
    const parsed = kbAskResultSchema.parse(noContextAnswer);

    expect(parsed.hasContext).toBe(false);
  });

  it("rejects an undeclared answer field, so backend drift surfaces as a parse failure and not an empty render", () => {
    expect(() =>
      kbAskResultSchema.parse({ ...baseAnswer, unknownFutureField: "surprise" }),
    ).toThrow();
  });

  it("preserves all six answer part fields together in a single parse", () => {
    const fullAnswer = {
      ...baseAnswer,
      citations: [{ ...page, passage: "Some passage text.", verified: true }],
      disagreement: { summary: "Sources slightly disagree on the exact number." },
    };
    const parsed = kbAskResultSchema.parse(fullAnswer);

    expect(parsed.disagreement?.summary).toBeTruthy();
    expect(parsed.citations[0]).toMatchObject({ passage: "Some passage text.", verified: true });
    expect(parsed.hasContext).toBe(true);
    expect(parsed.citations[0]?.updatedAt).toBeTruthy();
  });
});
