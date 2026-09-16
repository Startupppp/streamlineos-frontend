import {
  chatActiveHuddleContract,
  chatChannelContract,
  chatChannelMemberContract,
  chatChannelMemberPreviewContract,
  chatChannelPageContract,
  chatHuddleContract,
  chatMessagesPageContract,
  chatPollPageContract,
  chatPublicChannelContract,
} from "@/hooks/api/chat-schema";
import { chatChannelDetailContract } from "@/hooks/api/chat-extra-schema";

/**
 * Two halves, and the second one is the whole point.
 *
 * The ACCEPTS half is built from what the backend actually emits — the
 * `CHANNEL_LIST_COLUMNS` projection plus the four keys `withMemberPreview` and
 * `listMemberChannels` add, and the member shape pinned by
 * `CHANNEL_MEMBER_WIRE_KEYS`. A contract that rejects real traffic turns a
 * working screen into an error page.
 *
 * The BITE half feeds each contract the payload that actually shipped. A
 * contract copied from `types/chat.ts` would pass every test in the first half
 * and none in the second, which is the difference between a contract that is
 * satisfiable and one that is true.
 */

const MEMBER = {
  id: 41,
  channelId: 7,
  userId: "usr_alice",
  role: "MEMBER",
  mutedUntil: null,
  isFavorite: true,
  notificationPreference: "DEFAULT",
  user: { id: "usr_alice", name: "Alice", image: null },
};

const CHANNEL = {
  id: 7,
  name: "general",
  type: "PUBLIC",
  avatarUrl: null,
  isArchived: false,
  entityType: null,
  entityId: null,
  members: [MEMBER],
  memberCount: 12,
  membersTruncated: true,
  unreadCount: 3,
  lastMessage: {
    content: "ship it",
    senderName: "Alice",
    createdAt: "2026-09-02T12:00:00.000Z",
  },
};

const PUBLIC_CHANNEL = {
  id: 9,
  name: "announcements",
  description: "org-wide",
  avatarUrl: null,
  type: "PUBLIC",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastMessageAt: "2026-09-02T12:00:00.000Z",
  memberCount: 120,
  isMember: false,
};

describe("the chat contracts accept what the backend actually builds", () => {
  it("accepts a channel-list row with its bounded member preview", () => {
    expect(chatChannelContract.safeParse(CHANNEL).success).toBe(true);
  });

  it("accepts a member whose organization row is gone, as nulls and not as missing keys", () => {
    const orphan = { ...MEMBER, userId: null, user: null };
    expect(chatChannelMemberPreviewContract.safeParse(orphan).success).toBe(true);
  });

  it("accepts the members route's row, which carries the email the list preview drops", () => {
    const detail = {
      ...MEMBER,
      lastReadAt: "2026-09-01T10:00:00.000Z",
      joinedAt: "2026-08-01T09:00:00.000Z",
      archivedAt: null,
      user: { ...MEMBER.user, email: "alice@example.com" },
    };
    expect(chatChannelMemberContract.safeParse(detail).success).toBe(true);
  });

  it("keeps the two member shapes apart rather than sharing one loose object", () => {
    expect(chatChannelMemberPreviewContract.safeParse(MEMBER).success).toBe(true);
    expect(chatChannelMemberContract.safeParse(MEMBER).success).toBe(false);
  });

  it("accepts a channel with no last message and an empty roster", () => {
    const quiet = { ...CHANNEL, members: [], memberCount: 0, membersTruncated: false, lastMessage: null };
    expect(chatChannelContract.safeParse(quiet).success).toBe(true);
  });

  it("accepts a public-channel row, which carries no members and no unread count", () => {
    expect(chatPublicChannelContract.safeParse(PUBLIC_CHANNEL).success).toBe(true);
  });

  it("accepts a keyset page of either row type, on the last page and on a middle one", () => {
    const page = chatChannelPageContract(chatChannelContract);
    expect(page.safeParse({ channels: [CHANNEL], nextCursor: null }).success).toBe(true);
    expect(page.safeParse({ channels: [CHANNEL], nextCursor: "eyJpZCI6N30" }).success).toBe(true);
    expect(
      chatChannelPageContract(chatPublicChannelContract).safeParse({
        channels: [PUBLIC_CHANNEL],
        nextCursor: null,
      }).success,
    ).toBe(true);
  });
});

describe("BITE — the payload that actually shipped is rejected", () => {
  /**
   * The defect. `chat_channel_members` reaches `users` through
   * `organization_members`, and the read path shipped that join verbatim, so the
   * identity arrived two levels down under a table name. `member.user` was
   * `undefined` on every row: the favourites filter never matched, DIRECT
   * headers read "Unknown" and the channel-admin controls never appeared.
   */
  it("rejects the identity nested under membership instead of flattened", () => {
    const { userId: _userId, user: _user, ...rest } = MEMBER;
    const shipped = {
      ...rest,
      membership: { userId: "usr_alice", user: { id: "usr_alice", name: "Alice", image: null } },
    };
    const result = chatChannelMemberPreviewContract.safeParse(shipped);
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["userId", "user"]));
  });

  /**
   * The same lie one level up: a channel whose members carry the nested shape is
   * rejected at the channel, not silently accepted with an empty roster.
   */
  it("rejects a channel whose members carry the nested shape", () => {
    const { userId: _userId, user: _user, ...rest } = MEMBER;
    const broken = {
      ...CHANNEL,
      members: [{ ...rest, membership: { userId: "usr_alice", user: null } }],
    };
    expect(chatChannelContract.safeParse(broken).success).toBe(false);
  });

  /**
   * `columns: {}` selects NOTHING and emits `{}`. This is the huddle defect's
   * shape applied to a member: the join is paid for and arrives empty.
   */
  it("rejects a member whose sub-select was empty", () => {
    expect(chatChannelMemberPreviewContract.safeParse({ ...MEMBER, user: {} }).success).toBe(false);
  });

  it("rejects a member whose userId was dropped rather than nulled", () => {
    const { userId: _userId, ...withoutId } = MEMBER;
    expect(chatChannelMemberPreviewContract.safeParse(withoutId).success).toBe(false);
  });

  /**
   * `createdBy` is not a compatible addition — it is a field `types/chat.ts`
   * declared and no read path ever emitted. If it appears, something changed.
   */
  it("rejects a channel carrying a key the projection does not select", () => {
    expect(chatChannelContract.safeParse({ ...CHANNEL, createdBy: "usr_bob" }).success).toBe(false);
  });

  it("rejects a member row that is really an organization_members row", () => {
    const membershipRow = {
      ...MEMBER,
      user: { id: 41, orgId: "org_1", userId: "usr_alice", status: "ACTIVE" },
    };
    expect(chatChannelMemberPreviewContract.safeParse(membershipRow).success).toBe(false);
  });

  it("rejects a page whose cursor was dropped rather than nulled", () => {
    expect(
      chatChannelPageContract(chatChannelContract).safeParse({ channels: [CHANNEL] }).success,
    ).toBe(false);
  });
});

const CHANNEL_DETAIL = {
  id: 7,
  orgId: "org_1",
  name: "Apollo",
  description: null,
  type: "GROUP",
  avatarUrl: null,
  isArchived: false,
  entityType: "project",
  entityId: "1",
  isPinned: false,
  isPrivate: true,
  messageCount: 42,
  lastMessageAt: "2026-09-02T12:00:00.000Z",
  createdAt: "2026-08-01T09:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
  members: [
    {
      ...MEMBER,
      lastReadAt: "2026-09-01T10:00:00.000Z",
      joinedAt: "2026-08-01T09:00:00.000Z",
      archivedAt: null,
      user: { ...MEMBER.user, email: "alice@example.com" },
    },
  ],
};

describe("the channel-detail contract mirrors channelDetailSchema, not types/chat.ts", () => {
  it("accepts the detail payload, which carries no unreadCount and no lastMessage — both are computed by the LIST projection only", () => {
    expect(chatChannelDetailContract.safeParse(CHANNEL_DETAIL).success).toBe(true);
  });

  it("accepts the entity-channel lookup answering null when the record has no channel", () => {
    expect(chatChannelDetailContract.nullable().safeParse(null).success).toBe(true);
  });

  it("rejects a detail payload missing messageCount, which the chat_channels row always carries", () => {
    const { messageCount: _messageCount, ...withoutCount } = CHANNEL_DETAIL;
    expect(chatChannelDetailContract.safeParse(withoutCount).success).toBe(false);
  });

  it("rejects a detail payload missing lastMessageAt, which is NOT NULL on chat_channels", () => {
    const { lastMessageAt: _lastMessageAt, ...withoutTimestamp } = CHANNEL_DETAIL;
    expect(chatChannelDetailContract.safeParse(withoutTimestamp).success).toBe(false);
  });

  it("rejects the list row, so the two projections cannot be swapped for one another", () => {
    expect(chatChannelDetailContract.safeParse(CHANNEL).success).toBe(false);
  });
});

const HUDDLE_PARTICIPANT = {
  id: 3,
  huddleId: 11,
  joinedAt: "2026-09-02T12:00:00.000Z",
  leftAt: null,
  userId: "usr_alice",
  user: { id: "usr_alice", name: "Alice", image: null },
};

const HUDDLE = {
  id: 11,
  channelId: 7,
  status: "active",
  calendarEventId: null,
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  startedAt: "2026-09-02T12:00:00.000Z",
  endedAt: null,
  startedBy: "usr_alice",
  startedByUser: { id: "usr_alice", name: "Alice" },
  participants: [HUDDLE_PARTICIPANT],
};

describe("the huddle contract accepts what loadHuddleWire actually builds", () => {
  it("accepts an active huddle with one participant", () => {
    expect(chatHuddleContract.safeParse(HUDDLE).success).toBe(true);
  });

  it("accepts no active huddle, which is a 200 with a null body", () => {
    expect(chatActiveHuddleContract.safeParse(null).success).toBe(true);
  });

  it("accepts a participant whose organization row is gone", () => {
    const orphan = { ...HUDDLE, startedBy: null, startedByUser: null, participants: [{ ...HUDDLE_PARTICIPANT, userId: null, user: null }] };
    expect(chatHuddleContract.safeParse(orphan).success).toBe(true);
  });

  it("accepts a huddle whose Meet link was never minted", () => {
    expect(chatHuddleContract.safeParse({ ...HUDDLE, meetingUrl: null }).success).toBe(true);
  });
});

describe("BITE — a huddle read without a meeting link key is rejected, not silently linkless", () => {
  it("rejects a payload missing meetingUrl entirely", () => {
    const { meetingUrl: _meetingUrl, ...withoutLink } = HUDDLE;
    const result = chatHuddleContract.safeParse(withoutLink);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((i) => i.path.join("."))).toEqual(["meetingUrl"]);
  });

  it("rejects a meeting link that is not a URL", () => {
    const result = chatHuddleContract.safeParse({ ...HUDDLE, meetingUrl: "meet.google.com/abc-defg-hij" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((i) => i.path.join("."))).toEqual(["meetingUrl"]);
  });
});

describe("BITE — the huddle payload that actually shipped is rejected", () => {
  /**
   * `with: { membership: { columns: {} } }` — an empty selection selects
   * NOTHING. `userId` was never on the payload, so every tile read "Unknown"
   * and `isInHuddle` was permanently false.
   */
  it("rejects a participant whose membership sub-select was empty", () => {
    const shipped = { ...HUDDLE, participants: [{ id: 3, huddleId: 11, joinedAt: "2026-09-02T12:00:00.000Z", leftAt: null, membership: {} }] };
    const result = chatHuddleContract.safeParse(shipped);
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["participants.0.userId", "participants.0.user"]));
  });

  it("rejects a host emitted as a membership row rather than lifted to a user id", () => {
    const { startedBy: _startedBy, startedByUser: _startedByUser, ...rest } = HUDDLE;
    const shipped = { ...rest, startedByMembership: { userId: "usr_alice", user: { id: "usr_alice", name: "Alice" } } };
    expect(chatHuddleContract.safeParse(shipped).success).toBe(false);
  });

  it("rejects a participant carrying the membership id the wire keys exclude", () => {
    const shipped = { ...HUDDLE, participants: [{ ...HUDDLE_PARTICIPANT, membershipId: 41 }] };
    expect(chatHuddleContract.safeParse(shipped).success).toBe(false);
  });

  it("rejects the self-hosted media columns dropped with the Meet cutover", () => {
    for (const dropped of ["isMuted", "handRaised", "isScreenSharing"]) {
      const shipped = { ...HUDDLE, participants: [{ ...HUDDLE_PARTICIPANT, [dropped]: false }] };
      const result = chatHuddleContract.safeParse(shipped);
      expect(result.success).toBe(false);
      if (result.success) continue;
      const unrecognized = result.error.issues.flatMap((i) =>
        i.code === "unrecognized_keys" ? i.keys : [],
      );
      expect(unrecognized).toEqual([dropped]);
    }
  });
});

const ATTACHMENT = {
  id: 2,
  fileName: "spec.pdf",
  fileUrl: "org_1/chat/spec.pdf",
  fileKey: "org_1/chat/spec.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
};

const MESSAGE = {
  id: 900,
  orgId: "org_1",
  channelId: 7,
  senderMembershipId: 41,
  senderId: "usr_alice",
  sender: { id: "usr_alice", name: "Alice", image: null },
  content: "ship it",
  replyToId: null,
  isEdited: false,
  isDeleted: false,
  messageType: "text",
  metadata: null,
  actionStatus: null,
  clientKey: null,
  channelPosition: 12,
  createdAt: "2026-09-02T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
  attachments: [ATTACHMENT],
  replyTo: null,
};

describe("the message contract accepts what the timeline actually builds", () => {
  it("accepts a page of messages", () => {
    expect(
      chatMessagesPageContract.safeParse({ messages: [MESSAGE], nextCursor: null }).success,
    ).toBe(true);
    expect(
      chatMessagesPageContract.safeParse({ messages: [MESSAGE], nextCursor: 12 }).success,
    ).toBe(true);
  });

  it("accepts the poll page, which adds hasMore and latestPosition", () => {
    expect(
      chatPollPageContract.safeParse({
        messages: [MESSAGE],
        nextCursor: null,
        hasMore: false,
        latestPosition: null,
      }).success,
    ).toBe(true);
    expect(
      chatPollPageContract.safeParse({
        messages: [MESSAGE],
        nextCursor: 12,
        hasMore: true,
        latestPosition: 12,
      }).success,
    ).toBe(true);
  });

  /**
   * `latestPosition` is the server-authored resume point the poller advances on,
   * and `chat-message-timeline.service.ts` emits it on every page. A missing key
   * is drift, not a compatible older deploy: a client that resumed from its own
   * cursor instead would skip or replay the backlog.
   */
  it("rejects a poll page with no latestPosition", () => {
    expect(
      chatPollPageContract.safeParse({ messages: [MESSAGE], nextCursor: null, hasMore: false })
        .success,
    ).toBe(false);
  });

  /**
   * `orgId`, `clientKey`, `channelPosition` and `senderMembershipId` are on the
   * wire because the timeline selects no `columns:`. The contract is deliberately
   * NOT `.strict()` there: "every column of the table" is a set that grows with a
   * migration, and failing closed on it would take the timeline down.
   */
  it("accepts the columns the client does not read, and a column added later", () => {
    expect(chatMessagesPageContract.safeParse({ messages: [{ ...MESSAGE, aNewColumn: 1 }], nextCursor: null }).success).toBe(true);
  });

  it("accepts a message whose sender membership is gone — senderId null, sender all-null", () => {
    const orphan = {
      ...MESSAGE,
      senderMembershipId: null,
      senderId: null,
      sender: { id: null, name: null, image: null },
    };
    expect(chatMessagesPageContract.safeParse({ messages: [orphan], nextCursor: null }).success).toBe(true);
  });

  it("accepts a reply, which is a PARTIAL message with no attachments of its own", () => {
    const withReply = {
      ...MESSAGE,
      replyToId: 899,
      replyTo: { id: 899, content: "before", sender: { id: "usr_bob", name: "Bob", image: null } },
    };
    expect(chatMessagesPageContract.safeParse({ messages: [withReply], nextCursor: null }).success).toBe(true);
  });

  it("accepts the two entity-reference shapes the send DTO permits", () => {
    const withEntities = {
      ...MESSAGE,
      metadata: {
        forwardCount: 2,
        entities: [
          { type: "ticket", id: "12", projectId: 3, card: null },
          { type: "comment", id: "88", ticketId: 12, projectId: 3 },
        ],
      },
    };
    expect(chatMessagesPageContract.safeParse({ messages: [withEntities], nextCursor: null }).success).toBe(true);
  });
});

describe("BITE — the message payload that actually shipped is rejected", () => {
  /**
   * The worst of the seven. `chat_messages` has no `sender_id` column, so the
   * read path shipped `senderMembership` and `senderId` was on NO payload.
   * `isOwn = msg.senderId === currentUserId` was therefore always false: your own
   * messages rendered as somebody else's, Edit and Delete never appeared, and
   * `undefined === undefined` collapsed different senders under one header.
   */
  it("rejects a message with the identity left under senderMembership", () => {
    const { senderId: _senderId, sender: _sender, ...rest } = MESSAGE;
    const shipped = {
      ...rest,
      senderMembership: { userId: "usr_alice", user: { id: "usr_alice", name: "Alice" } },
    };
    const result = chatMessagesPageContract.safeParse({ messages: [shipped], nextCursor: null });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["messages.0.senderId", "messages.0.sender"]));
  });

  /**
   * The ninth instance, found by writing this contract. The timeline projected
   * five attachment columns and not `fileUrl`, while `forward-message-dialog`
   * re-posts `fileUrl` into a send DTO that requires `z.string()` — so every
   * forward of a message with an attachment came back 400.
   */
  it("rejects an attachment with no fileUrl, which is what forwarding posted", () => {
    const { fileUrl: _fileUrl, ...withoutUrl } = ATTACHMENT;
    const result = chatMessagesPageContract.safeParse({
      messages: [{ ...MESSAGE, attachments: [withoutUrl] }],
      nextCursor: null,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((i) => i.path.join("."))).toContain(
      "messages.0.attachments.0.fileUrl",
    );
  });

  it("rejects a sender emitted as null, which the read path never does", () => {
    expect(
      chatMessagesPageContract.safeParse({ messages: [{ ...MESSAGE, sender: null }], nextCursor: null })
        .success,
    ).toBe(false);
  });

  it("rejects a page whose cursor was dropped rather than nulled", () => {
    expect(chatMessagesPageContract.safeParse({ messages: [MESSAGE] }).success).toBe(false);
  });
});
