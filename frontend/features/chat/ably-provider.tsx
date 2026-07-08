"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { AblyProvider } from "ably/react";
import { getAblyClient } from "@/lib/ably";

export function ChatAblyProvider({ children }: { children: React.ReactNode }) {
  const client = getAblyClient();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      if (client.connection.state !== "closed") {
        client.close();
      }
      return;
    }

    const state = client.connection.state;
    if (state === "initialized" || state === "closed" || state === "failed") {
      client.connect();
    }

    return () => {
      if (client.connection.state !== "closed") {
        client.close();
      }
    };
  }, [client, status]);

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
