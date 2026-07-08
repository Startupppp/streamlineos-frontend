"use client";

import { useEffect, useState } from "react";
import { useAbly } from "ably/react";

export function useAblyConnection(): { isConnected: boolean; connectionError: string | null } {
  const ably = useAbly();
  const [isConnected, setIsConnected] = useState(
    () => ably.connection.state === "connected",
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    const handleDisconnected = () => setIsConnected(false);
    const handleFailed = () => {
      setIsConnected(false);
      setConnectionError("Real-time connection unavailable");
    };

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleFailed);
    ably.connection.on("suspended", handleDisconnected);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsConnected(ably.connection.state === "connected");
    if (ably.connection.state === "failed") {
      setConnectionError("Real-time connection unavailable");
    }

    return () => {
      ably.connection.off("connected", handleConnected);
      ably.connection.off("disconnected", handleDisconnected);
      ably.connection.off("failed", handleFailed);
      ably.connection.off("suspended", handleDisconnected);
    };
  }, [ably]);

  return { isConnected, connectionError };
}
