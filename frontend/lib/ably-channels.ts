
const LEGACY_CELL_ID = "legacy-1";

function resolveCellId(): string {
  const configured = process.env.NEXT_PUBLIC_ABLY_CELL_ID?.trim();
  return configured !== undefined && configured.length > 0
    ? configured
    : LEGACY_CELL_ID;
}

export const ABLY_CELL_ID = resolveCellId();

function cellChannelPrefix(): string {
  return `cell:${ABLY_CELL_ID}`;
}

export function cellPrefixed(channel: string): string {
  return `${cellChannelPrefix()}:${channel}`;
}

export function chatChannelName(orgId: string, channelId: number): string {
  return cellPrefixed(`chat:${orgId}:${channelId}`);
}

export function chatPresenceChannelName(orgId: string): string {
  return cellPrefixed(`chat:${orgId}:presence`);
}

export function huddleChannelName(orgId: string, channelId: number): string {
  return cellPrefixed(`huddle:${orgId}:${channelId}`);
}

export function notificationsChannelName(orgId: string, userId: string): string {
  return cellPrefixed(`notifications:${orgId}:${userId}`);
}

export function supportChannelName(orgId: string, ticketId: number): string {
  return cellPrefixed(`support:${orgId}:${ticketId}`);
}
