import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerFeedbackBar, CopyAnswerButton, CreateKnowledgeGapButton, InsufficientEvidenceBanner } from "./kb-chat-parts";

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

  it("reports a wrong-or-stale answer as not_helpful with a distinguishing comment", async () => {
    mockMutate.mockImplementation((_input, options) => options.onSuccess());
    render(<AnswerFeedbackBar question="How many leave days do I get?" />);

    await userEvent.click(screen.getByRole("button", { name: /report answer as wrong or stale/i }));

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
