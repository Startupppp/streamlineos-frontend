import Ably from "ably";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

type AblyAuthCallback = NonNullable<Ably.ClientOptions["authCallback"]>;

const ablyTokenRequestContract = lazyContract(() =>
  import("@/lib/ably-token-schema").then((m) => m.ablyTokenRequestContract),
);

/**
 * The fetch is a thunk rather than a path so each route stays a literal at its
 * own call site — a path threaded through a parameter is invisible to every
 * route rule in `check:response-contracts` and `check:gated-reads`.
 */
function tokenAuthCallback(
  fetchTokenRequest: () => Promise<Ably.TokenRequest>,
): AblyAuthCallback {
  return (_, callback) => {
    fetchTokenRequest()
      .then((tokenRequest) => callback(null, tokenRequest))
      .catch((error: unknown) => callback(getErrorMessage(error), null));
  };
}

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authCallback: tokenAuthCallback(() =>
        apiClient.get<Ably.TokenRequest>(
          "/chat/ably-token",
          undefined,
          undefined,
          ablyTokenRequestContract,
        ),
      ),
      autoConnect: false,
    });
  }
  return client;
}

let supportClient: Ably.Realtime | null = null;

export function getSupportAblyClient(): Ably.Realtime {
  if (!supportClient) {
    supportClient = new Ably.Realtime({
      authCallback: tokenAuthCallback(() =>
        apiClient.get<Ably.TokenRequest>(
          "/support/ably-token",
          undefined,
          undefined,
          ablyTokenRequestContract,
        ),
      ),
      autoConnect: false,
    });
  }
  return supportClient;
}

export async function reauthorizeAblyClients(): Promise<void> {
  const active = [client, supportClient].filter(
    (candidate): candidate is Ably.Realtime => candidate !== null,
  );
  await Promise.all(
    active.map((candidate) =>
      candidate.auth.authorize().catch(() => undefined),
    ),
  );
}
