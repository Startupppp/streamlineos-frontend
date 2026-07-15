import type {
  InboundMessage,
  Realtime,
  RealtimeChannel,
  messageCallback,
} from "ably";

export type AblyMessageListener = messageCallback<InboundMessage>;

export async function safeSubscribe(
  channel: RealtimeChannel,
  event: string,
  listener: AblyMessageListener,
): Promise<boolean> {
  try {
    await Promise.resolve(channel.subscribe(event, listener));
    return true;
  } catch {
    return false;
  }
}

export function safeUnsubscribe(
  channel: RealtimeChannel,
  event: string,
  listener: AblyMessageListener,
): void {
  try {
    channel.unsubscribe(event, listener);
  } catch {
    return;
  }
}

export function safeClose(client: Realtime): void {
  try {
    if (client.connection.state !== "closed") {
      client.close();
    }
  } catch {
    return;
  }
}

export function safeConnect(client: Realtime): void {
  try {
    client.connect();
  } catch {
    return;
  }
}
