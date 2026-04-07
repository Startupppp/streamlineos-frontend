/**
 * Ably Realtime client singleton for the browser.
 * Uses token auth so the API key is never exposed to the client.
 *
 * Import `getAblyClient()` wherever you need the shared Realtime instance.
 * The client is created lazily and reused across renders.
 */

import Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/chat/ably-token",
      authMethod: "GET",
      // Don't open the WebSocket until the first channel subscription is made.
      autoConnect: false,
    });
  }
  return client;
}
