"use client";

import { reauthorizeAblyClients } from "@/lib/ably";

export function refreshRealtimeCapability(): void {
  void reauthorizeAblyClients();
}

