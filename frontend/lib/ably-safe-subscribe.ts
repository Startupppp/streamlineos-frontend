import type {
  InboundMessage,
  Realtime,
  RealtimeChannel,
  messageCallback,
} from "ably";

export type AblyMessageListener = messageCallback<InboundMessage>;

function isCapabilityError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (!("statusCode" in error)) return false;
  return error.statusCode === 401 || error.statusCode === 403;
}

export async function safeSubscribe(
  channel: RealtimeChannel,
  event: string,
  listener: AblyMessageListener,
): Promise<boolean> {
  try {
    await Promise.resolve(channel.subscribe(event, listener));
    return true;
  } catch (error: unknown) {
    if (!isCapabilityError(error)) return false;
    try {
      const { reauthorizeAblyClients } = await import("./ably");
      await reauthorizeAblyClients();
      await Promise.resolve(channel.subscribe(event, listener));
      return true;
    } catch {
      return false;
    }
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
