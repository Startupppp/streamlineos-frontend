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
