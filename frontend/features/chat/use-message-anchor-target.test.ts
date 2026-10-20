import { act, renderHook } from "@testing-library/react";
import { useMessageAnchorTarget } from "./use-message-anchor-target";
import type { Message } from "./chat-types";

function message(id: number, replyToId: number | null = null): Message {
  return {
    id,
    channelId: 7,
    senderId: "user-2",
    sender: { id: "user-2", name: "Bo", image: null },
    content: `message ${id}`,
    replyToId,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    attachments: [],
    replyTo: null,
  };
}

type Options = Parameters<typeof useMessageAnchorTarget>[0];

function setup(initial: Options) {
  return renderHook((options: Options) => useMessageAnchorTarget(options), {
    initialProps: initial,
  });
}

describe("useMessageAnchorTarget — a ?message target that is a thread reply opens its thread", () => {
  it("opens the parent's thread when the anchored message is a reply", () => {
    const { result } = setup({
      channelId: 7,
      anchorMessageId: 12,
      messages: [message(10), message(12, 10)],
    });
    expect(result.current.threadMessageId).toBe(10);
  });

  it("opens no thread when the anchored message is a top-level message", () => {
    const { result } = setup({
      channelId: 7,
      anchorMessageId: 10,
      messages: [message(10), message(12, 10)],
    });
    expect(result.current.threadMessageId).toBeNull();
  });

  it("opens the thread once the reply arrives from the context endpoint, not before", () => {
    const { result, rerender } = setup({ channelId: 7, anchorMessageId: 3, messages: [message(10)] });
    expect(result.current.threadMessageId).toBeNull();
    rerender({ channelId: 7, anchorMessageId: 3, messages: [message(1), message(3, 1), message(10)] });
    expect(result.current.threadMessageId).toBe(1);
  });

  it("closing the anchored thread keeps it closed while the same ?message stays in the URL", () => {
    const messages = [message(10), message(12, 10)];
    const { result, rerender } = setup({ channelId: 7, anchorMessageId: 12, messages });
    act(() => result.current.closeThread());
    expect(result.current.threadMessageId).toBeNull();
    rerender({ channelId: 7, anchorMessageId: 12, messages: [...messages] });
    expect(result.current.threadMessageId).toBeNull();
  });

  it("a thread the reader opens wins over the anchored one", () => {
    const { result } = setup({
      channelId: 7,
      anchorMessageId: 12,
      messages: [message(10), message(11), message(12, 10)],
    });
    act(() => result.current.openThread(11));
    expect(result.current.threadMessageId).toBe(11);
  });

  it("a new ?message reply opens its own thread even after the reader closed the previous one", () => {
    const messages = [message(10), message(12, 10), message(20), message(21, 20)];
    const { result, rerender } = setup({ channelId: 7, anchorMessageId: 12, messages });
    act(() => result.current.closeThread());
    rerender({ channelId: 7, anchorMessageId: 21, messages });
    expect(result.current.threadMessageId).toBe(20);
  });

  it("switching conversation drops a thread opened in the previous one", () => {
    const { result, rerender } = setup({ channelId: 7, anchorMessageId: null, messages: [message(10)] });
    act(() => result.current.openThread(10));
    expect(result.current.threadMessageId).toBe(10);
    rerender({ channelId: 8, anchorMessageId: null, messages: [] });
    expect(result.current.threadMessageId).toBeNull();
  });
});

describe("useMessageAnchorTarget — the anchored message's position, so the render window can keep it", () => {
  it("reports the anchored message's index in the loaded messages", () => {
    const { result } = setup({
      channelId: 7,
      anchorMessageId: 12,
      messages: [message(10), message(11), message(12)],
    });
    expect(result.current.anchorIndex).toBe(2);
  });

  it("reports -1 when there is no anchor or it is not loaded yet", () => {
    const { result, rerender } = setup({ channelId: 7, anchorMessageId: null, messages: [message(10)] });
    expect(result.current.anchorIndex).toBe(-1);
    rerender({ channelId: 7, anchorMessageId: 99, messages: [message(10)] });
    expect(result.current.anchorIndex).toBe(-1);
  });
});
