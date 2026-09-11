import { messagePayloadSchema } from "@/hooks/api/chat-realtime-schema";

const WELL_FORMED = {
  id: 42,
  channelId: 1,
  senderId: "user-abc",
  senderName: "Alice",
  senderImage: null,
  content: "Hello",
  createdAt: "2024-01-01T00:00:00.000Z",
  replyToId: null,
};

function simulateMessageHandler(
  rawData: unknown,
  applyToCache: (id: number) => void,
): void {
  const parsed = messagePayloadSchema.safeParse(rawData);
  if (!parsed.success) return;
  applyToCache(parsed.data.id);
}

describe("chat-realtime — messagePayloadSchema validation", () => {
  it("rejects an empty object", () => {
    const result = messagePayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a payload where id is a string instead of a number", () => {
    const result = messagePayloadSchema.safeParse({ ...WELL_FORMED, id: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects a payload missing channelId", () => {
    const { channelId: _dropped, ...rest } = WELL_FORMED;
    const result = messagePayloadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts a minimal well-formed message payload", () => {
    const result = messagePayloadSchema.safeParse(WELL_FORMED);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(42);
  });

  it("accepts a full payload with optional fields", () => {
    const result = messagePayloadSchema.safeParse({
      ...WELL_FORMED,
      messageType: "text",
      attachments: [
        { id: 1, fileName: "a.png", fileUrl: "https://x", fileKey: "k", fileSize: 100, mimeType: "image/png" },
      ],
      metadata: { forwardCount: 2 },
    });
    expect(result.success).toBe(true);
  });

  it("leaves cache untouched when payload is malformed", () => {
    const applyToCache = jest.fn();
    simulateMessageHandler({}, applyToCache);
    expect(applyToCache).not.toHaveBeenCalled();
  });

  it("leaves cache untouched when id is a string", () => {
    const applyToCache = jest.fn();
    simulateMessageHandler({ ...WELL_FORMED, id: "bad" }, applyToCache);
    expect(applyToCache).not.toHaveBeenCalled();
  });

  it("applies a well-formed payload to cache", () => {
    const applyToCache = jest.fn();
    simulateMessageHandler(WELL_FORMED, applyToCache);
    expect(applyToCache).toHaveBeenCalledWith(42);
  });
});
