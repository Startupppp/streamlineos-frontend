import { collaborationQueryKeys } from "./collaboration";

function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.length <= key.length && prefix.every((part, index) => part === key[index]);
}

describe("the Ask OS conversation list key is not a prefix of a conversation's messages key", () => {
  it("does not match a messages key, because invalidateQueries is partial-match and refetched away the pending confirmation card", () => {
    const list = collaborationQueryKeys.aiChat.conversations();
    const messages = collaborationQueryKeys.aiChat.conversationMessages(42);

    expect(isPrefixOf(list, messages)).toBe(false);
  });

  it("still separates one conversation's messages from another's", () => {
    const one = collaborationQueryKeys.aiChat.conversationMessages(1);
    const two = collaborationQueryKeys.aiChat.conversationMessages(2);

    expect(isPrefixOf(one, two)).toBe(false);
  });

  it("keeps the history key clear of both, so clearing history cannot refetch a conversation", () => {
    const history = collaborationQueryKeys.aiChat.history();

    expect(isPrefixOf(history, collaborationQueryKeys.aiChat.conversations())).toBe(false);
    expect(isPrefixOf(history, collaborationQueryKeys.aiChat.conversationMessages(42))).toBe(false);
  });
});

describe("chat message-context keys nest so a channel sweep reaches every jump window", () => {
  it("makes the per-channel and all-channel context keys prefixes of a window key, without reaching another channel's windows", () => {
    const window = collaborationQueryKeys.chat.messageContext(7, 41);

    expect(isPrefixOf(collaborationQueryKeys.chat.messageContextsInChannel(7), window)).toBe(true);
    expect(isPrefixOf(collaborationQueryKeys.chat.messageContextsAll(), window)).toBe(true);
    expect(isPrefixOf(collaborationQueryKeys.chat.messageContextsInChannel(8), window)).toBe(false);
  });

  it("keeps reference-card and linked-record-preview keys outside the message-context sweep", () => {
    const sweep = collaborationQueryKeys.chat.messageContextsAll();

    expect(isPrefixOf(sweep, collaborationQueryKeys.chat.referenceCard(7, "ticket", "9"))).toBe(false);
    expect(isPrefixOf(sweep, collaborationQueryKeys.chat.linkedRecordPreview("ticket", "9"))).toBe(false);
  });
});
