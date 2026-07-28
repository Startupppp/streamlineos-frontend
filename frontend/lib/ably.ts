import Ably from "ably";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

type AblyAuthCallback = NonNullable<Ably.ClientOptions["authCallback"]>;

function tokenAuthCallback(path: string): AblyAuthCallback {
  return (_, callback) => {
    apiClient
      .get<Ably.TokenRequest>(path)
      .then((tokenRequest) => callback(null, tokenRequest))
      .catch((error: unknown) => callback(getErrorMessage(error), null));
  };
}

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authCallback: tokenAuthCallback("/chat/ably-token"),
      autoConnect: false,
    });
  }
  return client;
}

let supportClient: Ably.Realtime | null = null;

export function getSupportAblyClient(): Ably.Realtime {
  if (!supportClient) {
    supportClient = new Ably.Realtime({
      authCallback: tokenAuthCallback("/support/ably-token"),
      autoConnect: false,
    });
  }
  return supportClient;
}
