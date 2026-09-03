/**
 * The one place an Ably channel name is built.
 *
 * Every realtime channel is cell-scoped. The backend mints the token capability
 * on, and publishes to, `cell:<cellId>:<namespace>:...`
 * (streamlineos-backend/src/modules/realtime/ably.service.ts, via
 * `cellPrefixed` in src/common/cell-transport/cell-channel-namespace.ts). A name
 * without that prefix is not in the capability, so Ably refuses the attach with
 * a 403 that `safeSubscribe` swallows — the failure is silent by construction,
 * which is exactly how thirteen frontend call sites drifted onto the
 * pre-cell names and stayed there.
 *
 * Nothing outside this module may compose a channel name. The contract with the
 * backend, and the ban on inline names, are both asserted in
 * lib/__tests__/ably-channel-names.test.ts against the backend's own source.
 *
 * `CELL_ID` is optional on the backend and falls back to `LEGACY_CELL_ID`
 * ("legacy-1", src/common/region/placement.ts). The default here is the same
 * value for the same reason: a deployment that configures neither half must
 * still agree. A deployment that sets the backend's `CELL_ID` must set
 * `NEXT_PUBLIC_ABLY_CELL_ID` to the same value.
 */

/** Mirrors LEGACY_CELL_ID in streamlineos-backend/src/common/region/placement.ts. */
const LEGACY_CELL_ID = "legacy-1";

function resolveCellId(): string {
  const configured = process.env.NEXT_PUBLIC_ABLY_CELL_ID?.trim();
  return configured !== undefined && configured.length > 0
    ? configured
    : LEGACY_CELL_ID;
}

export const ABLY_CELL_ID = resolveCellId();

/** Mirrors `cellChannelPrefix` in the backend's cell-channel-namespace.ts. */
function cellChannelPrefix(): string {
  return `cell:${ABLY_CELL_ID}`;
}

/** Mirrors `cellPrefixed` in the backend's cell-channel-namespace.ts. */
export function cellPrefixed(channel: string): string {
  return `${cellChannelPrefix()}:${channel}`;
}

/** Granted subscribe+publish+history for each channel the caller belongs to. */
export function chatChannelName(orgId: string, channelId: number): string {
  return cellPrefixed(`chat:${orgId}:${channelId}`);
}

/** Org-wide chat presence. */
export function chatPresenceChannelName(orgId: string): string {
  return cellPrefixed(`chat:${orgId}:presence`);
}

/** Granted subscribe+publish alongside the chat channel of the same id. */
export function huddleChannelName(orgId: string, channelId: number): string {
  return cellPrefixed(`huddle:${orgId}:${channelId}`);
}

/** Granted subscribe-only, and only for the caller's own user id. */
export function huddleSignalChannelName(
  orgId: string,
  channelId: number,
  userId: string,
): string {
  return cellPrefixed(`huddle-signal:${orgId}:${channelId}:${userId}`);
}

/** Granted subscribe-only, and only for the caller's own user id. */
export function notificationsChannelName(orgId: string, userId: string): string {
  return cellPrefixed(`notifications:${orgId}:${userId}`);
}

/** Granted by the separate /support/ably-token capability. */
export function supportChannelName(orgId: string, ticketId: number): string {
  return cellPrefixed(`support:${orgId}:${ticketId}`);
}
