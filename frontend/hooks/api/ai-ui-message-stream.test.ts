import {
  createAiUiMessageStreamDecoder,
  isAiUiMessageStream,
} from "./ai-ui-message-stream";

function frame(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function textOf(events: ReturnType<ReturnType<typeof createAiUiMessageStreamDecoder>["decode"]>) {
  return events.map((event) => (event.type === "text" ? event.text : `!${event.message}`)).join("");
}

describe("detecting which of the two wire formats a stream response is", () => {
  it("recognises the header pipeAiUiMessageStream publishes for exactly this purpose", () => {
    expect(isAiUiMessageStream(new Headers({ "x-vercel-ai-ui-message-stream": "v1" }))).toBe(true);
  });

  it("falls back to the SSE content type, so a proxy that strips the vendor header still decodes", () => {
    expect(isAiUiMessageStream(new Headers({ "content-type": "text/event-stream" }))).toBe(true);
  });

  it("leaves the 26 raw text routes alone, which is the whole reason this is decided per response", () => {
    expect(isAiUiMessageStream(new Headers({ "content-type": "text/plain; charset=utf-8" }))).toBe(false);
    expect(isAiUiMessageStream(undefined)).toBe(false);
  });
});

describe("decoding the UI message stream the Ask OS chat route now sends", () => {
  it("yields only the answer text, never the raw SSE frames the user was reading on screen", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire = [
      frame({ type: "start" }),
      frame({ type: "start-step" }),
      frame({ type: "text-start", id: "a" }),
      frame({ type: "text-delta", id: "a", delta: "I don't" }),
      frame({ type: "text-delta", id: "a", delta: " have access" }),
      frame({ type: "text-end", id: "a" }),
      frame({ type: "finish-step" }),
      frame({ type: "finish" }),
      "data: [DONE]\n\n",
    ].join("");

    expect(textOf(decoder.decode(wire))).toBe("I don't have access");
  });

  it("reassembles a frame split across chunk boundaries, which is where a naive parser drops tokens", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const whole = frame({ type: "text-delta", id: "a", delta: "hello world" });
    const split = whole.length - 12;

    expect(textOf(decoder.decode(whole.slice(0, split)))).toBe("");
    expect(textOf(decoder.decode(whole.slice(split)))).toBe("hello world");
  });

  it("drops reasoning-delta, which carries the same shape as the answer but is the model's scratchpad", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire =
      frame({ type: "reasoning-delta", id: "r", delta: "the user is asking about" }) +
      frame({ type: "text-delta", id: "a", delta: "Hello" });

    expect(textOf(decoder.decode(wire))).toBe("Hello");
  });

  it("drops tool frames rather than painting their JSON into the reply", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire =
      frame({ type: "tool-input-start", toolCallId: "t1", toolName: "listTickets" }) +
      frame({ type: "tool-input-delta", toolCallId: "t1", inputTextDelta: '{"scope":' }) +
      frame({ type: "tool-output-available", toolCallId: "t1", output: { rows: 3 } }) +
      frame({ type: "text-delta", id: "a", delta: "You have 3 tickets." });

    expect(textOf(decoder.decode(wire))).toBe("You have 3 tickets.");
  });

  it("surfaces an error frame as an error event rather than silently ending on a half answer", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const events = decoder.decode(frame({ type: "error", errorText: "Insufficient AI credits" }));

    expect(events).toEqual([{ type: "error", message: "Insufficient AI credits" }]);
  });

  it("tolerates CRLF framing and keep-alive comment lines from an intermediary", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire = `: keep-alive\r\ndata: ${JSON.stringify({ type: "text-delta", id: "a", delta: "ok" })}\r\n\r\n`;

    expect(textOf(decoder.decode(wire))).toBe("ok");
  });

  it("ignores a malformed frame instead of throwing away the stream around it", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire =
      "data: {not json\n\n" + frame({ type: "text-delta", id: "a", delta: "still here" });

    expect(textOf(decoder.decode(wire))).toBe("still here");
  });

  it("flushes a last frame that arrived without its trailing newline", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire = `data: ${JSON.stringify({ type: "text-delta", id: "a", delta: "tail" })}`;

    expect(textOf(decoder.decode(wire))).toBe("");
    expect(textOf(decoder.flush())).toBe("tail");
  });

  it("preserves whitespace-only deltas, which carry the spacing between words", () => {
    const decoder = createAiUiMessageStreamDecoder();
    const wire =
      frame({ type: "text-delta", id: "a", delta: "one" }) +
      frame({ type: "text-delta", id: "a", delta: " " }) +
      frame({ type: "text-delta", id: "a", delta: "two" });

    expect(textOf(decoder.decode(wire))).toBe("one two");
  });
});
