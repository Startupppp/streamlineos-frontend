import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsConfirmationCard } from "./ask-os-confirmation-card";

const mutate = jest.fn();
const toastError = jest.fn();

jest.mock("@/hooks/api/ai-confirm-action", () => ({
  useConfirmAction: () => ({ mutate, isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));

const emailPreview = {
  toEmail: "adityachalla@gmail.com",
  subject: "testing streamlineos",
  bodyPreview: "Testing",
};

beforeEach(() => {
  mutate.mockReset();
  toastError.mockReset();
});

describe("a pending write is a compact proposal inside the message, not a nested AI draft card", () => {
  it("names the email fields in plain language and hides the machine action slug", () => {
    render(
      <AskOsConfirmationCard
        action="email.send"
        summary="Send email to adityachalla@gmail.com: testing streamlineos"
        preview={emailPreview}
        token="tok-1"
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
        action="email.send"
        summary="Send email to jane@example.com: Hello"
        preview={emailPreview}
        token="tok-1"
        onConfirmed={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("confirms with the proposal token and surfaces the result to the bubble", async () => {
    const onConfirmed = jest.fn();
    mutate.mockImplementation((_token: string, options: { onSuccess: (data: { result: Record<string, unknown> }) => void }) => {
      options.onSuccess({ result: { messageId: "m-1" } });
    });

    render(
      <AskOsConfirmationCard
        action="email.send"
        summary="Send email"
        preview={emailPreview}
        token="tok-confirm"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(mutate).toHaveBeenCalledWith("tok-confirm", expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(onConfirmed).toHaveBeenCalledWith({ messageId: "m-1" });
  });

  it("discards without calling the confirm endpoint so a change of mind is free", async () => {
    const onCancelled = jest.fn();

    render(
      <AskOsConfirmationCard
        action="email.send"
        summary="Send email"
        preview={emailPreview}
        token="tok-1"
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
        action="email.send"
        summary="Send email"
        preview={emailPreview}
        token="tok-1"
        onConfirmed={onConfirmed}
        onCancelled={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Proposal expired");
  });
});
