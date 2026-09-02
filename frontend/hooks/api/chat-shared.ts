"use client";

/**
 * Reauthorization happens after a membership change, never at import time, so
 * the 9 MB Ably client is pulled in only once a realtime surface needs it.
 * A static import here puts it in the first load of every route that reaches
 * the `hooks/api` barrel.
 */
export function refreshRealtimeCapability(): void {
  void import("@/lib/ably").then((module) => module.reauthorizeAblyClients());
}
