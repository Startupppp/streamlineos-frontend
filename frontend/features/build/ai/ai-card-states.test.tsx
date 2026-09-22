import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { RisksCard } from "./risks-card";
import { AiChatPanel } from "./ai-chat-panel";

if (typeof Element.prototype.scrollIntoView !== "function")
  Element.prototype.scrollIntoView = jest.fn();

const risksMutation = {
  data: undefined as unknown,
  isPending: false,
  isError: true,
  error: new ApiError("Insufficient AI credits", 402, "INSUFFICIENT_CREDITS") as unknown,
  mutate: jest.fn(),
  reset: jest.fn(),
};

const askMutation = {
  data: undefined as unknown,
  isPending: false,
  isError: true,
  error: new ApiError("Too many concurrent AI requests", 503, "AI_CONCURRENCY_LIMIT") as unknown,
  mutate: jest.fn(),
  reset: jest.fn(),
};

jest.mock("@/hooks/api/build/ai", () => ({
  useProjectAiRisks: () => risksMutation,
  useAskProjectAi: () => askMutation,
}));

describe("a build AI card renders the classified failure, not a red sentence", () => {
  it("sells an exhausted wallet as a top-up, not as a retry", () => {
    render(<RisksCard projectId={1} featureEnabled requiredPlan={null} />);

    expect(screen.getByText(/AI credits exhausted/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^retry$/i }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: /top up ai credits/i })).toHaveAttribute(
      "href",
      "/settings/billing/ai-credits",
    );
  });

  it("separates a full queue from a generic error in the project AI chat", () => {
    render(<AiChatPanel projectId={1} featureEnabled requiredPlan={null} />);
    expect(screen.getByText(/AI is busy right now/i)).toBeInTheDocument();
  });
});
