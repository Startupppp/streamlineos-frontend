import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useChatMessages } from "@/hooks/api/chat-core-read";
import { useSendMessage } from "@/hooks/api/chat-core-mutations-a";
import type { Message } from "@/types/chat";
import { useMessageTimeline } from "./use-message-timeline";

export const CHANNEL_ID = 7;

export function message(id: number, over: Partial<Message> = {}): Message {
  return {
    id,
    channelId: CHANNEL_ID,
    senderId: "user-2",
    sender: { id: "user-2", name: "Bo", image: null },
    content: `message ${id}`,
    replyToId: null,
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
    ...over,
  };
}

export function positioned(id: number) {
  return { ...message(id), channelPosition: id };
}

export function getCalls(suffix: string) {
  return jest.mocked(apiClient.get).mock.calls.filter(([path]) => String(path).endsWith(suffix));
}

export const leaveSpy = jest.fn();

export function useHarness(initialAnchor: number | null) {
  const [anchor, setAnchor] = useState<number | null>(initialAnchor);
  const handleLeave = useCallback(() => {
    leaveSpy();
    setAnchor(null);
  }, []);
  const history = useChatMessages(CHANNEL_ID);
  const send = useSendMessage();
  const timeline = useMessageTimeline({
    channelId: CHANNEL_ID,
    currentUserId: "user-1",
    members: undefined,
    anchorMessageId: anchor,
    onLeaveAnchor: handleLeave,
    canReadChannel: true,
    history,
    send,
  });
  return { anchor, timeline };
}

export function ids(result: { current: ReturnType<typeof useHarness> }) {
  return result.current.timeline.messages.map((m) => m.id);
}
