import React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { ChatBubble, type ChatMessage } from "@/components/kb/kb-chat-bubble";
import { KbSourcesSheet } from "../kb-sources-sheet";
import type { KbSource } from "@/hooks/api/kb/sources";

jest.mock("@/components/markdown/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => <p>{content}</p>,
}));

const CITATIONS: NonNullable<ChatMessage["citations"]> = [
  { kind: "page", pageId: 1, title: "Onboarding guide", spaceId: 1, updatedAt: "2026-09-01T10:00:00.000Z" },
  { kind: "source", sourceId: 2, title: "Employee handbook.pdf", spaceId: 1, updatedAt: "2026-09-01T10:00:00.000Z" },
  { kind: "article", articleId: 3, title: "Leave policy FAQ", slug: "leave-policy-faq", spaceId: 1, updatedAt: "2026-09-01T10:00:00.000Z" },
];

function source(overrides: Partial<KbSource>): KbSource {
  return {
    id: 1,
    kind: "file",
    title: "Quarterly report.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    fileUrl: null,
    status: "ready",
    chunkCount: 12,
    errorMessage: null,
    spaceId: 1,
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("KB chat citations — accessibility", () => {
  it("has no axe violations on an assistant answer that carries page, source and article citations", async () => {
    const { container } = renderWithProviders(
      <ChatBubble
        message={{ id: "m1", role: "assistant", content: "Here is what I found.", citations: CITATIONS }}
        onCitation={jest.fn()}
        reduce
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("has no axe violations on a user message and on an error answer", async () => {
    const { container } = renderWithProviders(
      <>
        <ChatBubble message={{ id: "u1", role: "user", content: "How do I request leave?" }} onCitation={jest.fn()} reduce />
        <ChatBubble message={{ id: "e1", role: "assistant", content: "Something went wrong.", isError: true }} onCitation={jest.fn()} reduce />
      </>,
    );
    await expectNoAxeViolations(container);
  });

  it("renders only the page citation as a navigable control, sources and articles as non-navigable text", () => {
    renderWithProviders(
      <ChatBubble
        message={{ id: "m2", role: "assistant", content: "Answer.", citations: CITATIONS }}
        onCitation={jest.fn()}
        reduce
      />,
    );
    const pageButton = screen.getByRole("button", { name: /Onboarding guide/ });
    expect(pageButton).toHaveAttribute("data-page-id", "1");
    expect(screen.queryByRole("button", { name: /Employee handbook/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Leave policy FAQ/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Employee handbook/)).toBeInTheDocument();
    expect(screen.getByText(/Leave policy FAQ/)).toBeInTheDocument();
  });

  it("de-duplicates repeated citations so a screen reader is not read the same source twice", () => {
    renderWithProviders(
      <ChatBubble
        message={{ id: "m3", role: "assistant", content: "Answer.", citations: [...CITATIONS, CITATIONS[0]!, CITATIONS[1]!] }}
        onCitation={jest.fn()}
        reduce
      />,
    );
    expect(screen.getAllByText(/Employee handbook/)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Onboarding guide/ })).toHaveLength(1);
  });
});

describe("KB ingestion-state sources sheet — accessibility", () => {
  function renderSheet(sources: KbSource[]) {
    return renderWithProviders(
      <KbSourcesSheet
        mode="manage"
        open
        onOpenChange={jest.fn()}
        sources={sources}
        isLoading={false}
        readyCount={sources.filter((s) => s.status === "ready").length}
        onUploadClick={jest.fn()}
        uploadPending={false}
        onAddNoteClick={jest.fn()}
        makeDeleteHandler={() => jest.fn()}
        deletingId={undefined}
        isDeleting={false}
      />,
    );
  }

  it("has no axe violations with sources in processing, failed and ready states", async () => {
    const { baseElement } = renderSheet([
      source({ id: 1, title: "Processing doc.pdf", status: "processing", chunkCount: 0 }),
      source({ id: 2, title: "Broken doc.pdf", status: "failed", chunkCount: 0, errorMessage: "Extraction failed" }),
      source({ id: 3, title: "Ready doc.pdf", status: "ready", chunkCount: 8 }),
    ]);
    await expectNoAxeViolations(baseElement);
  });

  it("has no axe violations in the empty state", async () => {
    const { baseElement } = renderSheet([]);
    await expectNoAxeViolations(baseElement);
  });

  it("exposes each source title as accessible text so the ingestion list is readable", () => {
    renderSheet([
      source({ id: 1, title: "Processing doc.pdf", status: "processing", chunkCount: 0 }),
      source({ id: 2, title: "Broken doc.pdf", status: "failed", chunkCount: 0, errorMessage: "Extraction failed" }),
    ]);
    expect(screen.getByText("Processing doc.pdf")).toBeInTheDocument();
    expect(screen.getByText("Broken doc.pdf")).toBeInTheDocument();
  });
});
