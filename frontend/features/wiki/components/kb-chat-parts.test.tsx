import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerFeedbackBar, CitationEvidenceList, CopyAnswerButton, CreateKnowledgeGapButton, InsufficientEvidenceBanner, VerificationBadge } from "./kb-chat-parts";

const mockMutate = jest.fn();
const mockCreateGapMutate = jest.fn();
let mockIsPending = false;
let mockCreateGapIsPending = false;

jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAiAnswerFeedback: () => ({ mutate: mockMutate, isPending: mockIsPending }),
  useCreateKbKnowledgeGap: () => ({ mutate: mockCreateGapMutate, isPending: mockCreateGapIsPending }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  mockMutate.mockReset();
  mockCreateGapMutate.mockReset();
  mockIsPending = false;
  mockCreateGapIsPending = false;
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

describe("CopyAnswerButton", () => {
  it("copies the answer text to the clipboard and confirms it", async () => {
    render(<CopyAnswerButton text="The answer is 20 days." />);

    await userEvent.click(screen.getByRole("button", { name: /copy answer/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("The answer is 20 days.");
    expect(await screen.findByRole("button", { name: /answer copied/i })).toBeInTheDocument();
  });

  it("keeps confirmation visible for two seconds after the latest copy", async () => {
    jest.useFakeTimers();
    try {
      render(<CopyAnswerButton text="Current answer" />);
      fireEvent.click(screen.getByRole("button", { name: "Copy answer" }));
      await act(async () => { await Promise.resolve(); });

      act(() => jest.advanceTimersByTime(1000));
      fireEvent.click(screen.getByRole("button", { name: "Answer copied" }));
      await act(async () => { await Promise.resolve(); });

      act(() => jest.advanceTimersByTime(1000));
      expect(screen.getByRole("button", { name: "Answer copied" })).toBeInTheDocument();

      act(() => jest.advanceTimersByTime(1000));
      expect(screen.getByRole("button", { name: "Copy answer" })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not start a reset timer when clipboard access resolves after unmount", async () => {
    jest.useFakeTimers();
    try {
      let resolveCopy: (() => void) | undefined;
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(() => new Promise<void>((resolve) => { resolveCopy = resolve; })),
        },
      });
      const view = render(<CopyAnswerButton text="Current answer" />);
      fireEvent.click(screen.getByRole("button", { name: "Copy answer" }));
      view.unmount();
      const timeoutSpy = jest.spyOn(window, "setTimeout");

      await act(async () => { resolveCopy?.(); });

      expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 2000)).toBe(false);
      timeoutSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("AnswerFeedbackBar", () => {
  it("submits helpful feedback with the original question", async () => {
    mockMutate.mockImplementation((_input, options) => options.onSuccess());
    render(<AnswerFeedbackBar question="How many leave days do I get?" />);

    await userEvent.click(screen.getByRole("button", { name: /mark answer as helpful/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { rating: "helpful", question: "How many leave days do I get?", comment: undefined },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(await screen.findByText(/thanks for the feedback/i)).toBeInTheDocument();
  });

  it("reports a wrong-or-stale answer as not_helpful with a distinguishing comment after confirmation", async () => {
    mockMutate.mockImplementation((_input, options) => options.onSuccess());
    render(<AnswerFeedbackBar question="How many leave days do I get?" />);

    await userEvent.click(screen.getByRole("button", { name: /report answer as wrong or stale/i }));

    expect(await screen.findByRole("button", { name: /send report/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        rating: "not_helpful",
        question: "How many leave days do I get?",
        comment: "Reported as wrong or stale",
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("does not render feedback controls once feedback has been given", async () => {
    mockMutate.mockImplementation((_input, options) => options.onSuccess());
    render(<AnswerFeedbackBar question="q" />);

    await userEvent.click(screen.getByRole("button", { name: /mark answer as helpful/i }));

    expect(screen.queryByRole("button", { name: /mark answer as not helpful/i })).not.toBeInTheDocument();
  });
});

describe("CreateKnowledgeGapButton", () => {
  it("reports the question and confirms once flagged", async () => {
    mockCreateGapMutate.mockImplementation((_input, options) => options.onSuccess());
    render(<CreateKnowledgeGapButton question="Where is the expense policy?" />);

    await userEvent.click(screen.getByRole("button", { name: /create a knowledge gap/i }));

    expect(mockCreateGapMutate).toHaveBeenCalledWith(
      { question: "Where is the expense policy?" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(await screen.findByText(/knowledge gap flagged/i)).toBeInTheDocument();
  });

  it("includes the selected Ask space when reporting a knowledge gap", async () => {
    render(<CreateKnowledgeGapButton question="Where is the policy?" spaceId={10} />);

    await userEvent.click(screen.getByRole("button", { name: /create a knowledge gap/i }));

    expect(mockCreateGapMutate).toHaveBeenCalledWith(
      { question: "Where is the policy?", spaceId: 10 },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe("InsufficientEvidenceBanner", () => {
  it("offers to create a knowledge gap for the unanswered question", () => {
    render(<InsufficientEvidenceBanner question="Where is the expense policy?" />);

    expect(screen.getByRole("button", { name: /create a knowledge gap/i })).toBeInTheDocument();
  });

  it("renders no create-knowledge-gap control without a question", () => {
    render(<InsufficientEvidenceBanner />);

    expect(screen.queryByRole("button", { name: /create a knowledge gap/i })).not.toBeInTheDocument();
  });
});

describe("VerificationBadge", () => {
  it("distinguishes an explicitly unverified source from an unavailable verification result", () => {
    render(<><VerificationBadge verified={false} /><VerificationBadge /></>);

    expect(screen.getByLabelText("Not verified source")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("Verified source")).not.toBeInTheDocument();
  });
});

describe("CitationEvidenceList", () => {
  it("preserves distinct passages from one source and removes repeated evidence across rerenders", () => {
    const first = { kind: "page" as const, pageId: 8, title: "Leave policy", spaceId: null, updatedAt: "2026-10-10T00:00:00.000Z", passage: "Annual leave is 20 days." };
    const second = { ...first, passage: "Carryover is limited to five days." };
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const view = render(<CitationEvidenceList citations={[first, second, first]} />);

      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByText("Annual leave is 20 days.")).toBeInTheDocument();
      expect(screen.getByText("Carryover is limited to five days.")).toBeInTheDocument();

      view.rerender(<CitationEvidenceList citations={[second, first, second]} />);

      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByText("Annual leave is 20 days.")).toBeInTheDocument();
      expect(screen.getByText("Carryover is limited to five days.")).toBeInTheDocument();
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

describe("CitationEvidenceList — KB-B-027", () => {
  it("does not repeat a cited title that has no passage, since the Sources chips already list it", () => {
    const bare = { kind: "page" as const, pageId: 9, title: "Imported page", spaceId: null, updatedAt: "2026-10-10T00:00:00.000Z" };
    const withPassage = { ...bare, pageId: 8, title: "Leave policy", passage: "Annual leave is 20 days." };

    render(<CitationEvidenceList citations={[bare, withPassage]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Imported page")).not.toBeInTheDocument();
  });
});
