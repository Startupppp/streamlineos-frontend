import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * Channel snapshot differences — what a marketplace thinks it holds against
 * what the ledger says.
 *
 * Keyed per channel so accepting a difference on one connection does not
 * refetch every other connection's queue.
 */
export const inventoryChannelSnapshotQueryKeys = {
  inventoryChannelSnapshots: {
    all: [...base, "inventory", "channelSnapshots"] as const,
    channel: (channelId: number) =>
      [...base, "inventory", "channelSnapshots", channelId] as const,
    diffs: (channelId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "channelSnapshots", channelId, params),
  },
} as const;
