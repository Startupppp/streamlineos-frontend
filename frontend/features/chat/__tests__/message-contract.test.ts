import { chatMessageContract, chatMessagesPageContract } from "@/hooks/api/chat-schema";
import { messagePayloadSchema } from "@/hooks/api/chat-realtime-schema";

const SENDER_FIXTURE = { id: "user-abc", name: "Alice", image: null };

const MESSAGE_FIXTURE = {
  id: 101,
  channelId: 7,
  senderId: "user-abc",
  sender: SENDER_FIXTURE,
  content: "Hello world",
  replyToId: null,
  replyTo: null,
  isEdited: false,
  isDeleted: false,
  messageType: "text" as const,
  metadata: null,
  actionStatus: null,
  reactions: {},
  clientKey: "uuid-1",
  channelPosition: 101,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  attachments: [],
};

describe("list wire — chatMessagesPageContract", () => {
  it("parses a page containing a well-formed message", () => {
    const result = chatMessagesPageContract.safeParse({
      messages: [MESSAGE_FIXTURE],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.messages[0]!.id).toBe(101);
      expect(result.data.messages[0]!.sender.name).toBe("Alice");
    }
  });

  it("parses a page with reactions record", () => {
    const result = chatMessagesPageContract.safeParse({
      messages: [{ ...MESSAGE_FIXTURE, reactions: { "👍": ["user-abc"] } }],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages[0]!.reactions["👍"]).toEqual(["user-abc"]);
    }
  });

  it("parses a message with a deleted sender (senderId nullable)", () => {
    const result = chatMessageContract.safeParse({
      ...MESSAGE_FIXTURE,
      senderId: null,
      sender: { id: null, name: null, image: null },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message missing the sender object", () => {
    const { sender: _dropped, ...rest } = MESSAGE_FIXTURE;
    const result = chatMessageContract.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a message where id is a string", () => {
    const result = chatMessageContract.safeParse({ ...MESSAGE_FIXTURE, id: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("send wire — the send response is the list message", () => {
  it("parses a send response with the exact contract the list uses", () => {
    const result = chatMessageContract.safeParse({ ...MESSAGE_FIXTURE, id: 202 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(202);
  });

  it("rejects the raw database row the send route used to return, so a regression to it fails loudly", () => {
    const { sender: _sender, senderId: _senderId, attachments: _attachments, replyTo: _replyTo, ...raw } = MESSAGE_FIXTURE;
    expect(chatMessageContract.safeParse({ ...raw, orgId: "org-1", senderMembershipId: 5 }).success).toBe(false);
  });
});

describe("realtime wire — messagePayloadSchema", () => {
  const REALTIME_FIXTURE = {
    id: 303,
    channelId: 7,
    senderId: "user-abc",
    senderName: "Alice",
    senderImage: null,
    content: "Realtime message",
    createdAt: "2026-01-03T00:00:00.000Z",
    replyToId: null,
  };

  it("parses a well-formed realtime payload", () => {
    const result = messagePayloadSchema.safeParse(REALTIME_FIXTURE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(303);
  });

  it("parses a payload from a deleted sender (senderId nullable)", () => {
    const result = messagePayloadSchema.safeParse({
      ...REALTIME_FIXTURE,
      senderId: null,
      senderName: null,
    });
    expect(result.success).toBe(true);
  });

  it("parses a payload with optional attachments and clientKey", () => {
    const result = messagePayloadSchema.safeParse({
      ...REALTIME_FIXTURE,
      clientKey: "uuid-rt-1",
      attachments: [
        { id: 1, fileName: "file.png", fileUrl: "https://cdn.x/f.png", fileKey: "k1", fileSize: 2048, mimeType: "image/png" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing channelId", () => {
    const { channelId: _dropped, ...rest } = REALTIME_FIXTURE;
    const result = messagePayloadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
