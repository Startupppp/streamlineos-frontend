import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryChannelSnapshotQueryKeys = {
  inventoryChannelSnapshots: {
    all: [...base, "inventory", "channelSnapshots"] as const,
    channel: (channelId: number) =>
      [...base, "inventory", "channelSnapshots", channelId] as const,
    diffs: (channelId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "channelSnapshots", channelId, params),
  },
} as const;
