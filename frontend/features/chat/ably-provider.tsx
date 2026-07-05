"use client";

import { useEffect } from "react";
import { AblyProvider } from "ably/react";
import { getAblyClient } from "@/lib/ably";

export function ChatAblyProvider({ children }: { children: React.ReactNode }) {
  const client = getAblyClient();

  useEffect(() => {
    if (client.connection.state === "initialized" || client.connection.state === "closed") {
      client.connect();
    }

    return () => {
      if (client.connection.state !== "closed") {
        client.close();
      }
    };
  }, [client]);

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
