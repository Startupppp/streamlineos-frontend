import { useEffect } from "react";
import { act, renderHook } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useSendMessage } from "@/hooks/api/chat-core-mutations-a";
import { CHANNEL_ID, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import type { Message } from "@/types/chat";
import { useMessageComposer } from "./use-message-composer";

export const DRAFT_KEY = "chat:draft:7";
export const mockedPost = jest.mocked(apiClient.post);

interface SendBody {
  content?: string;
  clientKey?: string;
}

export function readBody(body: unknown): SendBody {
  return {
    content: String(Reflect.get(Object(body), "content") ?? ""),
    clientKey: String(Reflect.get(Object(body), "clientKey") ?? ""),
  };
}

let nextId = 500;
export function serverRow(body: SendBody) {
  nextId += 1;
  return {
    id: nextId,
    orgId: "org-1",
    channelId: CHANNEL_ID,
    senderMembershipId: 11,
    content: body.content ?? null,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text" as const,
    metadata: null,
    actionStatus: null,
    clientKey: body.clientKey ?? null,
    channelPosition: nextId,
    createdAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
  };
}

export function isSendUrl(url: string, channelId = CHANNEL_ID): boolean {
  return url === `/chat/channels/${channelId}/messages`;
}

export function sendCalls(): SendBody[] {
  return mockedPost.mock.calls.filter(([url]) => isSendUrl(String(url))).map(([, body]) => readBody(body));
}

export function useComposerOverRealSend({
  isOnline,
  channelId = CHANNEL_ID,
  draftKey = DRAFT_KEY,
}: {
  isOnline: boolean;
  channelId?: number;
  draftKey?: string;
}) {
  const sendMessage = useSendMessage();
  const composer = useMessageComposer({
    channelId,
    draftKey,
    isOnline,
    sendMessage,
    editMessage: { mutateAsync: jest.fn(async () => ({})) },
    markRead: { mutate: jest.fn() },
    scrollToBottom: () => undefined,
    publishTyping: () => undefined,
    channel: undefined,
    currentUserId: "user-1",
  });
  const { messageInput } = composer;
  useEffect(() => {
    if (messageInput) localStorage.setItem(draftKey, messageInput);
    else localStorage.removeItem(draftKey);
  }, [messageInput, draftKey]);
  return composer;
}

export function mount(client: QueryClient, isOnline: boolean) {
  return renderHook(useComposerOverRealSend, { wrapper: wrapperFor(client), initialProps: { isOnline } });
}

type Mounted = ReturnType<typeof mount>;

export async function typeAndSend(hook: Mounted, text: string) {
  await act(async () => {
    hook.result.current.setMessageInput(text);
  });
  await act(async () => {
    void hook.result.current.handleSend();
  });
}

export function delivered(messages: Message[]): Message[] {
  return messages.filter((message) => message.id > 0);
}
