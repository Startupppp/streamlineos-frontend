import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { KbAskResult } from "@/hooks/api/kb/ask-result-schema";
import { KbAskPanel } from "./kb-ask-panel";

const mockMutate = jest.fn();
jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAsk: () => ({ mutate: mockMutate, isPending: false, isError: false, stop: jest.fn(), resetAttempt: jest.fn() }),
  useKbAiAnswerFeedback: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/support/kb-rag", () => ({ usePublicAskSupportKb: () => ({ mutate: jest.fn(), isPending: false }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const answer: KbAskResult = {
  answer: "You get twenty days.",
  hasContext: true,
  conversationId: 5,
  citations: [
    { kind: "article", articleId: 4, slug: "reset", title: "Reset a password", spaceId: 1, updatedAt: "2026-09-01T00:00:00.000Z", passage: "Use the account recovery form.", verified: true },
    { kind: "document", linkedDocumentId: 31, title: "Leave Policy", spaceId: null, updatedAt: "2026-09-01T00:00:00.000Z", verified: false },
  ],
  disagreement: { summary: "The article and policy give different deadlines." },
};

async function ask(result: KbAskResult = answer) {
  mockMutate.mockImplementation((_input: unknown, options: { onSuccess: (data: KbAskResult) => void }) => options.onSuccess(result));
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

  it("shows source passages, freshness, verification, and disagreement from the Ask result", async () => {
    await ask();

    const evidence = screen.getByRole("list", { name: "Source evidence" });
    expect(evidence).toHaveTextContent("Use the account recovery form.");
    expect(evidence).toHaveTextContent("Updated");
    expect(evidence).toHaveTextContent("Verified source");
    expect(evidence).toHaveTextContent("Not verified source");
    expect(screen.getByRole("note")).toHaveTextContent("The article and policy give different deadlines.");
  });

  it("labels absent verification as unavailable and does not invent a passage or disagreement", async () => {
    await ask({ ...answer, citations: [{ kind: "page", pageId: 9, title: "Draft", spaceId: 1, updatedAt: "2026-09-01T00:00:00.000Z" }], disagreement: undefined });

    const evidence = screen.getByRole("list", { name: "Source evidence" });
    expect(evidence).toHaveTextContent("Verification unavailable");
    expect(evidence.querySelector("blockquote")).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("keeps the insufficient-evidence state when the result has no context", async () => {
    await ask({ ...answer, hasContext: false, citations: [], disagreement: undefined });

    expect(screen.getByText("No knowledge-base sources matched")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Source evidence" })).not.toBeInTheDocument();
  });

});
