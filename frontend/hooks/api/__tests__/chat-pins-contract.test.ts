import { chatPinsContract } from "@/hooks/api/chat-schema";

/**
 * CHAT-012: `POST .../pins` answered 200, then the pins refetch was rejected — the contract
 * expected `pinnedBy` as a person object and a `message.replyTo` the list never loads. This is
 * the JSON `ChatPinsService.listPins` emits (`chatPinItemSchema`).
 */
const WIRE_PIN = {
  id: 3,
  orgId: "org-1",
  channelId: 7,
  messageId: 90,
  pinnedByMembershipId: 11,
  pinnedAt: "2026-09-30T10:00:00.000Z",
  pinnedBy: "user-1",
  pinnedByUser: { id: "user-1", name: "Asha" },
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
    senderId: "user-2",
    sender: { id: "user-2", name: "Ravi", image: null },
    attachments: [],
    reactions: { "👍": ["user-1"] },
  },
};

describe("chatPinsContract accepts what listPins emits", () => {
  it("accepts a pin whose pinner is an id and whose message carries no replyTo", () => {
    const parsed = chatPinsContract.safeParse([WIRE_PIN]);
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("accepts a pin whose sender membership is gone", () => {
    const departed = { ...WIRE_PIN, message: { ...WIRE_PIN.message, senderId: null, sender: null } };
    expect(chatPinsContract.safeParse([departed]).success).toBe(true);
  });

  it("accepts a pin whose pinner membership is gone", () => {
    expect(
      chatPinsContract.safeParse([{ ...WIRE_PIN, pinnedBy: null, pinnedByUser: null }]).success,
    ).toBe(true);
  });

  it("BITE: rejects the pinner as a person object, which the backend never sends", () => {
    const wrong = { ...WIRE_PIN, pinnedBy: { id: "user-1", name: "Asha" } };
    expect(chatPinsContract.safeParse([wrong]).success).toBe(false);
  });
});
