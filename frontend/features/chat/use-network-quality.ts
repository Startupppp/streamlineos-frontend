"use client";

import { useEffect, useState } from "react";

export type NetworkQuality = "excellent" | "good" | "poor" | "unknown";

export function useNetworkQuality(pc: RTCPeerConnection | null): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>("unknown");

  useEffect(() => {
    if (!pc) return;
    let stopped = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (stopped) return;
      try {
        const stats = await pc.getStats();
        if (stopped) return;
        let totalPacketsLost = 0;
        let totalPacketsSent = 0;
        let rtt = 0;
        stats.forEach((report) => {
          if (report.type === "remote-inbound-rtp" && report.kind === "audio") {
            totalPacketsLost += (report.packetsLost as number) ?? 0;
            totalPacketsSent += ((report.totalPacketsSent as number) ?? 0) || 1;
            rtt = (report.roundTripTime as number) ?? 0;
          }
        });
        const lossRate = totalPacketsSent > 0 ? totalPacketsLost / totalPacketsSent : 0;
        if (rtt < 0.1 && lossRate < 0.01) setQuality("excellent");
        else if (rtt < 0.3 && lossRate < 0.05) setQuality("good");
        else setQuality("poor");
      } catch {
        if (!stopped) setQuality("unknown");
      }
      if (!stopped) timerId = setTimeout(poll, 4000);
    };
    void poll();
    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [pc]);

  return quality;
}
