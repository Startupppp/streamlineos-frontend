"use client";

import { useAblyConnection } from "@/features/chat/use-ably-connection";

export function useRealtimePollInterval(fallbackMs: number): number | false {
  const { isConnected } = useAblyConnection();
  return isConnected ? false : fallbackMs;
}
