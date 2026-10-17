import { QueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  invalidateChatChannelRead,
  invalidateChatInboundMessage,
  invalidateChatMessageDeleted,
  invalidateChatMessageEdited,
  invalidateChatMessageSent,
  invalidateChatUnreadState,
} from "@/lib/chat-read-state";

const EDITED_CHANNEL = 1;
const OTHER_CHANNEL = 2;

type Probe =
  | "editedMessages"
  | "otherMessages"
  | "editedPins"
  | "otherPins"
  | "savedMessages"
  | "editedFiles"
  | "myChannels"
  | "unreadTotal"
  | "editedThread"
  | "otherThread";

const PROBES: Record<Probe, readonly unknown[]> = {
  editedMessages: collaborationQueryKeys.chat.messages(EDITED_CHANNEL),
  otherMessages: collaborationQueryKeys.chat.messages(OTHER_CHANNEL),
  editedPins: collaborationQueryKeys.chat.pins(EDITED_CHANNEL),
  otherPins: collaborationQueryKeys.chat.pins(OTHER_CHANNEL),
  savedMessages: collaborationQueryKeys.chat.savedMessages(),
  editedFiles: collaborationQueryKeys.chat.channelFiles(EDITED_CHANNEL),
  myChannels: collaborationQueryKeys.chat.myChannels(),
  unreadTotal: collaborationQueryKeys.chat.unreadTotal(),
  editedThread: collaborationQueryKeys.chat.thread(EDITED_CHANNEL, 55),
  otherThread: collaborationQueryKeys.chat.thread(OTHER_CHANNEL, 99),
};

const MESSAGE_BODY_SURFACES: Probe[] = [
  "editedMessages",
  "editedPins",
  "editedThread",
  "myChannels",
  "savedMessages",
];

function primedClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  for (const key of Object.values(PROBES)) client.setQueryData(key, { seeded: true });
  return client;
}

function invalidated(client: QueryClient): Probe[] {
  return (Object.keys(PROBES) as Probe[]).filter(
    (name) => client.getQueryState(PROBES[name])?.isInvalidated === true,
  );
}

describe("editing a message refreshes every surface that renders its body, and no other channel", () => {
  it("reaches that channel's messages, threads and pins, plus saved messages and the channel preview", () => {
    const client = primedClient();

    invalidateChatMessageEdited(client, EDITED_CHANNEL);

    expect(invalidated(client).sort()).toEqual([...MESSAGE_BODY_SURFACES].sort());
  });

  it("leaves another channel's messages, pins and threads cached, which the old chat.all sweep discarded", () => {
    const client = primedClient();

    invalidateChatMessageEdited(client, EDITED_CHANNEL);

    for (const untouched of ["otherMessages", "otherPins", "otherThread"] as const)
      expect(client.getQueryState(PROBES[untouched])?.isInvalidated).toBe(false);
  });

  it("does not disturb the unread badge, because editing a message changes no unread count", () => {
    const client = primedClient();

    invalidateChatMessageEdited(client, EDITED_CHANNEL);

    expect(client.getQueryState(PROBES.unreadTotal)?.isInvalidated).toBe(false);
  });

  it("does not refetch the shared files panel, because an edit changes no attachment", () => {
    const client = primedClient();

    invalidateChatMessageEdited(client, EDITED_CHANNEL);

    expect(client.getQueryState(PROBES.editedFiles)?.isInvalidated).toBe(false);
  });
});

describe("deleting a message", () => {
  it("refreshes the same body-rendering surfaces, so a deleted message cannot survive in pins or saved messages", () => {
    const client = primedClient();

    invalidateChatMessageDeleted(client, EDITED_CHANNEL);

    expect(invalidated(client).sort()).toEqual([...MESSAGE_BODY_SURFACES].sort());
  });

  it("leaves another channel untouched", () => {
    const client = primedClient();

    invalidateChatMessageDeleted(client, EDITED_CHANNEL);

    expect(client.getQueryState(PROBES.otherMessages)?.isInvalidated).toBe(false);
  });
});

describe("sending a message", () => {
  it("refreshes the channel's messages and the channel list, and nothing else", () => {
    const client = primedClient();

    invalidateChatMessageSent(client, EDITED_CHANNEL, false);

    expect(invalidated(client).sort()).toEqual(["editedMessages", "myChannels"]);
  });

  it("also refreshes the shared files panel when the send carried an attachment", () => {
    const client = primedClient();

    invalidateChatMessageSent(client, EDITED_CHANNEL, true);

    expect(invalidated(client).sort()).toEqual([
      "editedFiles",
      "editedMessages",
      "myChannels",
    ]);
  });

  it("positive control — a send with no attachment leaves the files panel cached", () => {
    const client = primedClient();

    invalidateChatMessageSent(client, EDITED_CHANNEL, false);

    expect(client.getQueryState(PROBES.editedFiles)?.isInvalidated).toBe(false);
  });
});

describe("unread state", () => {
  it("marking a channel read refreshes the channel list, the unread badge and that channel", () => {
    const client = primedClient();

    invalidateChatChannelRead(client, EDITED_CHANNEL);

    expect(invalidated(client).sort()).toEqual(["myChannels", "unreadTotal"]);
  });

  it("an inbound realtime message refreshes only the two unread surfaces", () => {
    const client = primedClient();

    invalidateChatUnreadState(client);

    expect(invalidated(client).sort()).toEqual(["myChannels", "unreadTotal"]);
  });

  it("an inbound reply also refreshes its thread", () => {
    const client = primedClient();

    invalidateChatInboundMessage(client, OTHER_CHANNEL, 99);

    expect(invalidated(client).sort()).toEqual([
      "myChannels",
      "otherThread",
      "unreadTotal",
    ]);
  });

  it("an inbound message that is not a reply touches no thread cache", () => {
    const client = primedClient();

    invalidateChatInboundMessage(client, OTHER_CHANNEL, null);

    expect(invalidated(client).sort()).toEqual(["myChannels", "unreadTotal"]);
  });
});
