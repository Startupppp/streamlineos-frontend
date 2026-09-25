import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { KbAskResponse } from "@/types/kb";
import { KbAskPanel } from "./kb-ask-panel";

const mockMutate = jest.fn();
jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAsk: () => ({ mutate: mockMutate, isPending: false, isError: false, stop: jest.fn(), resetAttempt: jest.fn() }),
  useKbAiAnswerFeedback: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/support/kb-rag", () => ({ usePublicAskSupportKb: () => ({ mutate: jest.fn(), isPending: false }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const answer: KbAskResponse = {
  answer: "You get twenty days.",
  hasContext: true,
  conversationId: 5,
  citations: [
    { kind: "article", articleId: 4, slug: "reset", title: "Reset a password", spaceId: 1, updatedAt: "2026-09-01T00:00:00.000Z" },
    { kind: "document", linkedDocumentId: 31, title: "Leave Policy", spaceId: null, updatedAt: "2026-09-01T00:00:00.000Z" },
  ],
};

async function ask() {
  mockMutate.mockImplementation((_input: unknown, options: { onSuccess: (data: KbAskResponse) => void }) => options.onSuccess(answer));
  render(<KbAskPanel mode="authed" />);
  await userEvent.type(screen.getByPlaceholderText(/reset my password/i), "How many days of leave?");
  await userEvent.click(screen.getByRole("button", { name: /ask/i }));
}

describe("KbAskPanel citations", () => {
  it("links a company document to its entry in the Knowledge Base, and an article to its support page", async () => {
    await ask();

    expect(await screen.findByRole("link", { name: /leave policy/i })).toHaveAttribute("href", "/knowledge/wiki/company-documents/31");
    expect(screen.getByRole("link", { name: /reset a password/i })).toHaveAttribute("href", "/support/kb/4");
  });
});
