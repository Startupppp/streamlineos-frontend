import { chatSavedMessagesContract } from "@/hooks/api/chat-schema";

/**
 * Found in a local browser pass after CHAT-012: every saved-messages page answered 200 and was
 * rejected, because the contract required `message.replyTo`, which `ChatSavedService.list`
 * never loads. This is the JSON that service emits (`chatSavedListResponseSchema`).
 */
const WIRE_SAVED = {
  id: 201,
  orgId: "org-1",
  membershipId: 11,
  messageId: 90,
  savedAt: "2026-09-30T10:00:00.000Z",
  message: {
    id: 90,
    orgId: "org-1",
    channelId: 7,
    senderMembershipId: 12,
    content: "ship it",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    clientKey: null,
    channelPosition: 4,
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    channel: { id: 7, name: "general", type: "PUBLIC", entityType: null, entityId: null },
    attachments: [],
    senderId: "user-2",
    sender: { id: "user-2", name: "Ravi", image: null },
    reactions: {},
  },
};

describe("chatSavedMessagesContract accepts what the saved list emits", () => {
  it("accepts a saved message that carries no replyTo", () => {
    const parsed = chatSavedMessagesContract.safeParse({ items: [WIRE_SAVED], nextCursor: null });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("accepts a saved message whose sender membership is gone", () => {
    const departed = { ...WIRE_SAVED, message: { ...WIRE_SAVED.message, senderId: null, sender: null } };
    expect(chatSavedMessagesContract.safeParse({ items: [departed], nextCursor: null }).success).toBe(true);
  });

  it("normalises a final-page null nextCursor to undefined, the value TanStack v5 reads as no next page", () => {
    const parsed = chatSavedMessagesContract.parse({ items: [], nextCursor: null });
    expect(parsed.nextCursor).toBeUndefined();
  });
});
