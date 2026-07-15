"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { AblyProvider } from "ably/react";
import { getAblyClient } from "@/lib/ably";
import { safeClose, safeConnect } from "@/lib/ably-safe-subscribe";

export function ChatAblyProvider({ children }: { children: React.ReactNode }) {
  const client = getAblyClient();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      safeClose(client);
      return;
    }

    const state = client.connection.state;
    if (state === "initialized" || state === "closed" || state === "failed") {
      safeConnect(client);
    }

    return () => {
      safeClose(client);
    };
  }, [client, status]);

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
