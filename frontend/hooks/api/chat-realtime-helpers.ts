import type { InfiniteData } from "@tanstack/react-query";
import type { RealtimeChannel } from "ably";
import { flattenMessagePages } from "@/features/chat/message-page-merge";
import type { Message, MessagesPage } from "@/types/chat";
import type { MessagePayload } from "./chat-realtime-schema";

export function payloadToMessage(
  payload: MessagePayload,
  parent: Message | undefined,
): Message {
  const createdAt = payload.createdAt ?? new Date().toISOString();
  return {
    id: payload.id,
    channelId: payload.channelId,
    senderId: payload.senderId,
    content: payload.content,
    replyToId: payload.replyToId ?? null,
    isEdited: false,
    isDeleted: false,
    messageType: payload.messageType ?? "text",
    metadata: payload.metadata ?? null,
    actionStatus: null,
    reactions: {},
    clientKey: payload.clientKey,
    createdAt,
    updatedAt: createdAt,
    sender: {
      id: payload.senderId,
      name: payload.senderName ?? null,
      image: payload.senderImage ?? null,
    },
    attachments: payload.attachments ?? [],
    replyTo: parent
      ? {
          id: parent.id,
          content: parent.content,
          sender: parent.sender,
          isDeleted: parent.isDeleted,
        }
      : null,
  };
}

export function messagesAddedByResync(
  before: InfiniteData<MessagesPage>,
  after: InfiniteData<MessagesPage>,
): number {
  const known = flattenMessagePages(before);
  const ids = new Set(known.map((message) => message.id));
  const clientKeys = new Set(
    known.flatMap((message) => (message.clientKey ? [message.clientKey] : [])),
  );
  return flattenMessagePages(after).filter(
    (message) =>
      !ids.has(message.id) &&
      !(message.clientKey && clientKeys.has(message.clientKey)),
  ).length;
}

function isCapabilityRefusal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}

export async function reviveFailedChannel(
  channel: RealtimeChannel,
): Promise<void> {
  if (channel.state !== "failed") return;
  try {
    await channel.attach();
  } catch (error: unknown) {
    if (!isCapabilityRefusal(error)) return;
    try {
      const { reauthorizeAblyClients } = await import("@/lib/ably");
      await reauthorizeAblyClients();
      await channel.attach();
    } catch {
      return;
    }
  }
}
