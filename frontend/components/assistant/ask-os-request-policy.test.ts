import { ApiError } from "@/lib/api-envelope";
import {
  ASK_OS_MAX_MESSAGE_CHARS,
  askOsComposerRefusal,
  askOsInputError,
  askOsPageContext,
  boundedAskOsContext,
  prepareAskOsSend,
} from "./ask-os-request-policy";

describe("boundedAskOsContext", () => {
  it("keeps only the newest twenty messages in chronological order", () => {
    const messages = Array.from({ length: 25 }, (_, index) => ({
      content: String(index),
    }));

    expect(boundedAskOsContext(messages)).toEqual(messages.slice(5));
  });

  it("keeps the newest content within the character budget", () => {
    const messages = [
      { content: "a".repeat(10_000) },
      { content: "b".repeat(20_000) },
    ];
    const result = boundedAskOsContext(messages);

    expect(result).toHaveLength(2);
    expect(result[0]?.content).toHaveLength(ASK_OS_MAX_MESSAGE_CHARS);
    expect(result[1]?.content).toHaveLength(ASK_OS_MAX_MESSAGE_CHARS);
  });
});

describe("prepareAskOsSend", () => {
  it("blocks a message that the chat body schema would refuse", () => {
    const text = "a".repeat(ASK_OS_MAX_MESSAGE_CHARS + 1);
    expect(askOsInputError(text)).toBe(
      `Message is too long (${(ASK_OS_MAX_MESSAGE_CHARS + 1).toLocaleString()} / ${ASK_OS_MAX_MESSAGE_CHARS.toLocaleString()} characters).`,
    );
    expect(prepareAskOsSend(text)).toEqual({
      status: "invalid",
      error: askOsInputError(text),
    });
  });

  it("lets a message inside the chat body limit through", () => {
    expect(askOsInputError("hello")).toBeNull();
    expect(prepareAskOsSend("  hello  ")).toEqual({ status: "ready", text: "hello" });
    expect(prepareAskOsSend("   ")).toEqual({ status: "empty" });
  });

  it("turns a chat-body Zod refusal into a composer message", () => {
    const error = new ApiError("Validation failed.", 400, "VALIDATION_FAILED", [
      {
        path: "messages.0.content",
        message: "Too big: expected string to have <=10000 characters",
      },
    ]);
    expect(askOsComposerRefusal(error)).toBe(
      `Each message can be at most ${ASK_OS_MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
    );
    expect(
      askOsComposerRefusal(new ApiError("AI credits exhausted", 402, "INSUFFICIENT_CREDITS")),
    ).toBeNull();
    expect(
      askOsComposerRefusal(new ApiError("Validation failed.", 400, "VALIDATION_FAILED")),
    ).toBe("This message could not be sent. Check the text and try again.");
  });
});

describe("askOsPageContext", () => {
  it("names the project and ticket when a Build ticket route clearly identifies them", () => {
    expect(askOsPageContext("/build/42/tickets/STRE-7")).toEqual({
      route: "/build/42/tickets/STRE-7",
      module: "build",
      projectId: "42",
      recordType: "ticket",
      recordId: "STRE-7",
    });
  });

  it("names the project alone on a project sub-page", () => {
    expect(askOsPageContext("/build/42/bugs")).toEqual({
      route: "/build/42/bugs",
      module: "build",
      projectId: "42",
    });
  });

  it("does not mistake a static Build page for a project", () => {
    expect(askOsPageContext("/build/my-work")).toEqual({ route: "/build/my-work", module: "build" });
  });

  it("reads a record from a numeric or uuid id under its collection", () => {
    expect(askOsPageContext("/crm/leads/123")).toEqual({
      route: "/crm/leads/123",
      module: "crm",
      recordType: "lead",
      recordId: "123",
    });
    expect(askOsPageContext("/hr/employees/0b6f9c1e-8a52-4a0e-9d51-2c3f4a5b6c7d/edit")).toMatchObject({
      module: "hr",
      recordType: "employee",
      recordId: "0b6f9c1e-8a52-4a0e-9d51-2c3f4a5b6c7d",
    });
  });

  it("guesses nothing from a non-id segment", () => {
    expect(askOsPageContext("/crm/leads/duplicates")).toEqual({
      route: "/crm/leads/duplicates",
      module: "crm",
    });
  });

  it("caps the route at 300 characters and handles the root", () => {
    expect(askOsPageContext(`/${"a".repeat(400)}`).route).toHaveLength(300);
    expect(askOsPageContext("/")).toEqual({ route: "/" });
  });
});
