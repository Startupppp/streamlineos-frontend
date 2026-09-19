import { ApiError } from "@/lib/api-envelope";
import {
  ASK_OS_MAX_MESSAGE_CHARS,
  askOsComposerRefusal,
  askOsInputError,
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
