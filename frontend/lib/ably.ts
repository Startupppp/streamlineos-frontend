

import Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/chat/ably-token",
      authMethod: "GET",

      autoConnect: false,
    });
  }
  return client;
}

let supportClient: Ably.Realtime | null = null;

export function getSupportAblyClient(): Ably.Realtime {
  if (!supportClient) {
    supportClient = new Ably.Realtime({
      authUrl: "/api/support/ably-token",
      authMethod: "GET",
      autoConnect: false,
    });
  }
  return supportClient;
}
