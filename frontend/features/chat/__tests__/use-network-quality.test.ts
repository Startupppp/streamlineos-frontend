import { renderHook, act } from "@testing-library/react";
import { useNetworkQuality } from "../use-network-quality";

function makePc(reports: RTCStatsReport): Partial<RTCPeerConnection> {
  return {
    getStats: jest.fn().mockResolvedValue(reports),
  };
}

function makeStats(entries: { type: string; kind?: string; packetsLost?: number; totalPacketsSent?: number; roundTripTime?: number }[]): RTCStatsReport {
  const map = new Map(
    entries.map((e, i) => [String(i), e as unknown as RTCStats]),
  );
  return map as unknown as RTCStatsReport;
}

describe("useNetworkQuality", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'unknown' when no RTCPeerConnection provided", () => {
    const { result } = renderHook(() => useNetworkQuality(null));
    expect(result.current).toBe("unknown");
  });

  it("returns 'excellent' for low RTT and near-zero packet loss", async () => {
    const stats = makeStats([
      { type: "remote-inbound-rtp", kind: "audio", packetsLost: 0, totalPacketsSent: 1000, roundTripTime: 0.05 },
    ]);
    const pc = makePc(stats) as RTCPeerConnection;
    const { result } = renderHook(() => useNetworkQuality(pc));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe("excellent");
  });

  it("returns 'good' for moderate RTT and acceptable packet loss", async () => {
    const stats = makeStats([
      { type: "remote-inbound-rtp", kind: "audio", packetsLost: 30, totalPacketsSent: 1000, roundTripTime: 0.2 },
    ]);
    const pc = makePc(stats) as RTCPeerConnection;
    const { result } = renderHook(() => useNetworkQuality(pc));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe("good");
  });

  it("returns 'poor' for high RTT or high packet loss", async () => {
    const stats = makeStats([
      { type: "remote-inbound-rtp", kind: "audio", packetsLost: 100, totalPacketsSent: 1000, roundTripTime: 0.5 },
    ]);
    const pc = makePc(stats) as RTCPeerConnection;
    const { result } = renderHook(() => useNetworkQuality(pc));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe("poor");
  });

  it("returns 'unknown' when getStats rejects", async () => {
    const pc = {
      getStats: jest.fn().mockRejectedValue(new Error("stats unavailable")),
    } as unknown as RTCPeerConnection;
    const { result } = renderHook(() => useNetworkQuality(pc));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toBe("unknown");
  });
});
