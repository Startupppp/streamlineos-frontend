import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsConfirmationCard, ConfirmDirectiveSlot } from "./ask-os-confirmation-card";
import type { ConfirmActionResult } from "@/hooks/api/ai-confirm-action";
import { ApiError } from "@/lib/api-envelope";

const mutate = jest.fn();
const decline = jest.fn();
const toastError = jest.fn();
let mockRecovery: Record<string, unknown> = { isPending: false, isError: false, data: undefined };

jest.mock("@/hooks/api/ai-confirm-action", () => ({
  refusedConfirmOutcome: jest.requireActual("@/hooks/api/ai-confirm-action").refusedConfirmOutcome,
  useConfirmAction: () => ({ mutate, isPending: false }),
  useDeclineProposal: () => ({ mutate: decline, isPending: false }),
  useRecoverProposal: () => mockRecovery,
}));
jest.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));

const emailPreview = {
  toEmail: "adityachalla@gmail.com",
  subject: "testing streamlineos",
  bodyPreview: "Testing",
};

beforeEach(() => {
  mutate.mockReset();
  decline.mockReset();
  toastError.mockReset();
  mockRecovery = { isPending: false, isError: false, data: undefined };
});

describe("a persisted proposal recovers without storing its capability token in history", () => {
  const directive = {
    kind: "confirm-action" as const,
    proposalId: 41,
    action: "mail.send",
    summary: "Send the update",
    preview: emailPreview,
    title: "Send email",
    confirmLabel: "Send",
  };

  it("rehydrates a live server-owned proposal and confirms with the newly issued token", async () => {
    mockRecovery = {
      isPending: false,
      isError: false,
      data: {
        state: "ready",
        proposalId: 41,
        action: "mail.send",
        token: "reissued-token",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    };
    mutate.mockImplementation((_token: string, options: { onSuccess: (data: ConfirmActionResult) => void }) => {
      options.onSuccess({ ok: true, result: {}, summary: "Sent" });
    });
    render(<ConfirmDirectiveSlot directive={directive} persisted />);

    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(mutate).toHaveBeenCalledWith("reissued-token", expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("keeps a revoked proposal non-actionable and explains why", () => {
    mockRecovery = {
      isPending: false,
      isError: false,
      data: {
        state: "unavailable",
        proposalId: 41,
        action: "mail.send",
        reason: "You no longer have permission to send mail.",
      },
    };
    render(<ConfirmDirectiveSlot directive={directive} persisted />);

    expect(screen.getByText("You no longer have permission to send mail.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send|confirm|discard/i })).not.toBeInTheDocument();
  });
});

describe("a pending write is a compact proposal inside the message, not a nested AI draft card", () => {
  it("names the email fields in plain language and hides the machine action slug", () => {
    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Send email to adityachalla@gmail.com: testing streamlineos"
        preview={emailPreview}
        token="tok-1"
        title="Send email"
        confirmLabel="Send"
        onConfirmed={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    expect(screen.getByText("Send email")).toBeInTheDocument();
    expect(screen.getByText("adityachalla@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("testing streamlineos")).toBeInTheDocument();
    expect(screen.getByText("Testing")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
    expect(screen.queryByText(/email\.send/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/action:/i)).not.toBeInTheDocument();
  });

  it("uses Send as the primary label for an email so Confirm is not a generic verb", () => {
    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Send email to jane@example.com: Hello"
        preview={emailPreview}
        token="tok-1"
        title="Send email"
        confirmLabel="Send"
        onConfirmed={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("confirms with the proposal token and surfaces the result to the bubble", async () => {
    const onConfirmed = jest.fn();
    mutate.mockImplementation((_token: string, options: { onSuccess: (data: ConfirmActionResult) => void }) => {
      options.onSuccess({ ok: true, result: { messageId: "m-1" }, summary: "Email sent to jane@example.com" });
    });

    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Send email"
        preview={emailPreview}
        token="tok-confirm"
        title="Send email"
        confirmLabel="Send"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(mutate).toHaveBeenCalledWith("tok-confirm", expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(onConfirmed).toHaveBeenCalledWith({
      ok: true,
      result: { messageId: "m-1" },
      summary: "Email sent to jane@example.com",
    });
  });

  it("hands the backend summary to the bubble instead of dropping it, so the outcome line can say what happened", async () => {
    const onConfirmed = jest.fn();
    mutate.mockImplementation((_token: string, options: { onSuccess: (data: ConfirmActionResult) => void }) => {
      options.onSuccess({
        ok: true,
        result: { bonusId: 9 },
        summary: "Bonus created (PENDING payroll approval): 5000",
      });
    });

    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Grant a bonus"
        preview={{ amount: "5000" }}
        token="tok-bonus"
        title="Grant bonus"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Bonus created (PENDING payroll approval): 5000" }),
    );
  });

  it("discards without calling the confirm endpoint so a change of mind is free", async () => {
    const onCancelled = jest.fn();

    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Send email"
        preview={emailPreview}
        token="tok-1"
        title="Send email"
        confirmLabel="Send"
        onConfirmed={jest.fn()}
        onCancelled={onCancelled}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("toasts a failed confirm and keeps the proposal instead of pretending it sent", async () => {
    const onConfirmed = jest.fn();
    mutate.mockImplementation((_token: string, options: { onError: (error: Error) => void }) => {
      options.onError(new Error("Proposal expired"));
    });

    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Send email"
        preview={emailPreview}
        token="tok-1"
        title="Send email"
        confirmLabel="Send"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Proposal expired");
  });

  it("falls back to the summary as card title and Confirm as button label when the backend supplies neither, so a tool with no action label entry still works", () => {
    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Do something important"
        preview={{}}
        token="tok-1"
        onConfirmed={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    expect(screen.getByText("Do something important")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});

describe("a persisted confirmation card records the proposal without allowing re-execution", () => {
  it("shows the card title and all preview fields in read-only form", () => {
    render(
      <AskOsConfirmationCard
        mode="record"
        summary="Send email to adityachalla@gmail.com: testing streamlineos"
        preview={emailPreview}
        title="Send email"
      />,
    );

    expect(screen.getByText("Send email")).toBeInTheDocument();
    expect(screen.getByText("adityachalla@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("testing streamlineos")).toBeInTheDocument();
    expect(screen.getByText("Testing")).toBeInTheDocument();
  });

  it("renders no Confirm or Discard button when mode is record so the token cannot be resubmitted after a page refresh", () => {
    render(
      <AskOsConfirmationCard
        mode="record"
        summary="Send email to adityachalla@gmail.com: testing streamlineos"
        preview={emailPreview}
        title="Send email"
      />,
    );

    expect(screen.queryByRole("button", { name: /send|confirm|discard/i })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows the past-proposal copy so the read-only state reads as deliberate not broken", () => {
    render(
      <AskOsConfirmationCard
        mode="record"
        summary="Send email to adityachalla@gmail.com: testing streamlineos"
        preview={emailPreview}
        title="Send email"
      />,
    );

    expect(screen.getByText("Past proposal — view only.")).toBeInTheDocument();
  });
});

describe("a refused confirm shows the server's receipt instead of a bare toast", () => {
  function renderLive(onConfirmed: (outcome: ConfirmActionResult) => void) {
    render(
      <AskOsConfirmationCard
        mode="live"
        summary="Clock in"
        preview={{ change: "clock in" }}
        token="7.secret"
        title="Clock in"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
  }

  it("hands a conflicted receipt from the error details to the bubble", async () => {
    const onConfirmed = jest.fn();
    const receipt = {
      proposalId: 7,
      action: "self.clockIn",
      status: "conflicted",
      summary: "Attendance changed since this was proposed.",
      at: "2026-10-09T10:00:00.000Z",
    };
    mutate.mockImplementation((_token: string, options: { onError: (error: Error) => void }) => {
      options.onError(new ApiError("Conflict", 409, "CONFLICT", { receipt }));
    });

    renderLive(onConfirmed);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ ok: false, receipt }));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("explains an in-flight duplicate that carries no receipt without claiming success", async () => {
    const onConfirmed = jest.fn();
    mutate.mockImplementation((_token: string, options: { onError: (error: Error) => void }) => {
      options.onError(new ApiError("Proposal already confirmed or executed", 409));
    });

    renderLive(onConfirmed);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("This action is already being processed. Check the result before trying again.");
  });
});
