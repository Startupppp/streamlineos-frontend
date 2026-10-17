import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { KbAskCitation } from "@/types/kb";
import { ChatBubble } from "./kb-chat-bubble";

jest.mock("@/components/markdown/markdown-content", () => ({ MarkdownContent: ({ content }: { content: string }) => <p>{content}</p> }));

const documentCitation: KbAskCitation = { kind: "document", linkedDocumentId: 31, title: "Leave Policy", spaceId: null, updatedAt: "2026-09-01T00:00:00.000Z" };
const pageCitation: KbAskCitation = { kind: "page", pageId: 9, title: "Onboarding", spaceId: 1, updatedAt: "2026-09-01T00:00:00.000Z" };

function renderBubble(citations: KbAskCitation[], onCitation = jest.fn()) {
  render(<ChatBubble message={{ id: "m1", role: "assistant", content: "You get twenty days.", citations }} onCitation={onCitation} reduce />);
  return onCitation;
}

describe("ChatBubble citations", () => {
  it("shows a company document as a button that says it is an HR document, carrying its entry id", async () => {
    const onCitation = renderBubble([documentCitation]);

    const chip = screen.getByRole("button", { name: "HR document: Leave Policy" });
    expect(chip).toHaveAttribute("data-linked-document-id", "31");
    await userEvent.click(chip);
    expect(onCitation).toHaveBeenCalledTimes(1);
  });

  it("keeps a page citation as it was, with its page id and no document id", () => {
    renderBubble([pageCitation]);

    const chip = screen.getByRole("button", { name: /onboarding/i });
    expect(chip).toHaveAttribute("data-page-id", "9");
    expect(chip).not.toHaveAttribute("data-linked-document-id");
  });

  it("lists the same document once, though it was cited twice", () => {
    renderBubble([documentCitation, { ...documentCitation }, pageCitation]);

    expect(screen.getAllByRole("button", { name: "HR document: Leave Policy" })).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("sizes the document icon from the spacing scale, keeps it from shrinking and hides it from assistive tech", () => {
    renderBubble([documentCitation]);

    const icon = screen.getByRole("button", { name: "HR document: Leave Policy" }).querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("h-3", "w-3", "shrink-0");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.getAttribute("class")).not.toMatch(/\[[^\]]*px\]/);
  });

  it("names a document with a blank title rather than showing an empty chip", () => {
    renderBubble([{ ...documentCitation, title: "  " }]);

    expect(screen.getByRole("button", { name: "HR document: Company document" })).toBeInTheDocument();
  });
});
