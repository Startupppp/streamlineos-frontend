import { render, screen } from "@testing-library/react";
import { AskOsChatComposer } from "./ask-os-chat-composer";
import { ASK_OS_MAX_MESSAGE_CHARS } from "./ask-os-request-policy";

const composerProps = {
  isStreaming: false,
  onInputChange: jest.fn(),
  onSelectPersona: jest.fn(),
  onStop: jest.fn(),
  onSubmit: jest.fn(),
  selectedPersona: null,
};

describe("Ask OS composer validation", () => {
  it("keeps a server validation refusal on the input instead of a thread retry", () => {
    render(
      <AskOsChatComposer
        {...composerProps}
        error="messages.0.content: Too big: expected string to have <=10000 characters"
        input="Send this email"
      />,
    );

    const field = screen.getByPlaceholderText("Ask anything about your organization…");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(
      "messages.0.content: Too big: expected string to have <=10000 characters",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "messages.0.content: Too big: expected string to have <=10000 characters",
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("stops send when the typed message is already longer than the chat body allows", () => {
    render(
      <AskOsChatComposer
        {...composerProps}
        error={null}
        input={"a".repeat(ASK_OS_MAX_MESSAGE_CHARS + 1)}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Message is too long");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
