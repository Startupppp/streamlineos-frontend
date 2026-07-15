"use client";

import { useEffect } from "react";
import { AblyProvider } from "ably/react";
import { getSupportAblyClient } from "@/lib/ably";
import { safeClose, safeConnect } from "@/lib/ably-safe-subscribe";

export function SupportAblyProvider({ children }: { children: React.ReactNode }) {
  const client = getSupportAblyClient();

  useEffect(() => {
    if (client.connection.state === "initialized" || client.connection.state === "closed") {
      safeConnect(client);
    }

    return () => {
      safeClose(client);
    };
  }, [client]);

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
