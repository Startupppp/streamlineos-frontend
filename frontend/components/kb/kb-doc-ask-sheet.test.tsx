import { act, fireEvent, render, screen } from "@testing-library/react";
import { KbDocAskSheet } from "./kb-doc-ask-sheet";

jest.mock("@/hooks/api/ai-text-stream", () => ({
  useAiTextStream: jest.fn(),
  isAiStreamAbort: jest.fn().mockReturnValue(false),
}));

jest.mock("@/hooks/api/kb/doc-ai-stream", () => ({
  streamKbDocAi: jest.fn(),
}));

jest.mock("@/components/markdown/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => <p>{content}</p>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  BookOpenTextIcon: () => null,
  SendIcon: () => null,
}));

const { useAiTextStream } = jest.requireMock("@/hooks/api/ai-text-stream") as {
  useAiTextStream: jest.Mock;
};

const SHEET_PROPS = {
  scope: "pages" as const,
  docId: 1,
  open: true,
  onOpenChange: jest.fn(),
  title: "Ask this page",
  description: "Questions are grounded in this document.",
};

describe("KbDocAskSheet — suggestion single-fire guard (FE-181)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAiTextStream.mockReturnValue({
      run: jest.fn().mockReturnValue(new Promise(() => {})),
      stop: jest.fn(),
      isStreaming: false,
    });
  });

  it("does not add a second user message when two suggestion pills are clicked before the isStreaming state updates, because the guard relies on React state (isStreaming) which has not yet propagated when the second click fires", () => {
    render(<KbDocAskSheet {...SHEET_PROPS} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Summarize this page" }));
      fireEvent.click(screen.getByRole("button", { name: "What are the key points?" }));
    });

    expect(screen.getByText("Summarize this page")).toBeInTheDocument();
    expect(screen.queryByText("What are the key points?")).not.toBeInTheDocument();
  });

  it("positive control: clicking a single suggestion pill sends exactly that question, confirming the sheet renders and fire-once behaviour does not suppress a legitimate first send", () => {
    render(<KbDocAskSheet {...SHEET_PROPS} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Summarize this page" }));
    });

    expect(screen.getByText("Summarize this page")).toBeInTheDocument();
  });
});
