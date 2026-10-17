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

/**
 * Events only the SERVER may author. A chat token grants `publish` on the caller's
 * chat and huddle channels (the browser publishes `typing` and `huddle:chat`), so any
 * member could otherwise publish a forged `message`, `reaction:updated` or huddle
 * frame. The backend publishes over REST with the API key and no `clientId`; Ably
 * stamps every browser publish with the token's `clientId`, which cannot be forged.
 */
const SERVER_AUTHORED_EVENTS: ReadonlySet<string> = new Set([
  "message",
  "message:updated",
  "message:deleted",
  "reaction:updated",
  "huddle:started",
  "huddle:user_joined",
  "huddle:user_left",
  "huddle:ended",
  "huddle:state_updated",
  "huddle:kicked",
  "notification:message",
  "notification:mention",
]);

/** True when a server-authored event arrives with a `clientId`, i.e. a browser published it. */
export function isForgedServerFrame(
  event: string,
  clientId: string | null | undefined,
): boolean {
  return SERVER_AUTHORED_EVENTS.has(event) && clientId !== undefined && clientId !== null;
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
