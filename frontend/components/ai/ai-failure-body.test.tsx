import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { AiFailureBody } from "./ai-failure-body";

interface Case {
  label: string;
  error: unknown;
  shows: RegExp;
  offersRetry: boolean;
}

const CASES: Case[] = [
  {
    label: "the credit ledger's 402",
    error: new ApiError("Insufficient AI credits", 402, "INSUFFICIENT_CREDITS"),
    shows: /AI credits exhausted/i,
    offersRetry: false,
  },
  {
    label: "a plan gate's 402",
    error: new ApiError("Module not enabled", 402, "MODULE_NOT_ENABLED"),
    shows: /don't have access to this AI feature/i,
    offersRetry: false,
  },
  {
    label: "a revoked permission",
    error: new Error("Missing permission: build:ai:use"),
    shows: /don't have access to this AI feature/i,
    offersRetry: false,
  },
  {
    label: "the concurrency cap",
    error: new ApiError("Too many concurrent AI requests", 503),
    shows: /AI is busy right now/i,
    offersRetry: true,
  },
  {
    label: "a tripped breaker",
    error: new ApiError("AI provider is temporarily unavailable", 503),
    shows: /AI is temporarily unavailable/i,
    offersRetry: true,
  },
  {
    label: "a transport failure",
    error: new ApiError("Network error", undefined, "NETWORK_ERROR"),
    shows: /You're offline/,
    offersRetry: true,
  },
  {
    label: "a user abort",
    error: new ApiError("Request was cancelled.", undefined, "ABORTED"),
    shows: /You stopped this request/i,
    offersRetry: true,
  },
];

describe("AiFailureBody — a card's failure branch is classified, not one red sentence", () => {
  it.each(CASES)("$label renders its own state", ({ error, shows }) => {
    render(<AiFailureBody error={error} onRetry={jest.fn()} />);
    expect(screen.getByText(shows)).toBeInTheDocument();
  });

  it.each(CASES)(
    "$label offers Retry only when a re-dispatch can help",
    ({ error, offersRetry }) => {
      render(<AiFailureBody error={error} onRetry={jest.fn()} />);
      const retry = screen.queryByRole("button", { name: /try again|retry|run again/i });
      expect(retry !== null).toBe(offersRetry);
    },
  );

  it("points an exhausted wallet at the top-up page instead of a dead retry", () => {
    render(
      <AiFailureBody
        error={new ApiError("Insufficient AI credits", 402, "INSUFFICIENT_CREDITS")}
        onRetry={jest.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: /top up ai credits/i });
    expect(link).toHaveAttribute("href", "/settings/billing/ai-credits");
  });

  it("renders a distinguishable surface per failure, not one sentence repeated", () => {
    const rendered = CASES.map(({ error }) => {
      const view = render(<AiFailureBody error={error} onRetry={jest.fn()} />);
      const text = view.container.textContent ?? "";
      view.unmount();
      return text;
    });
    expect(new Set(rendered).size).toBe(CASES.length);
  });
});
