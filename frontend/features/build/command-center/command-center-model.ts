export const COMMAND_CENTER_HEALTH_VALUES = [
  "on_track",
  "at_risk",
  "off_track",
] as const;

export type CommandCenterHealth = (typeof COMMAND_CENTER_HEALTH_VALUES)[number];

export function isCommandCenterHealth(v: string): v is CommandCenterHealth {
  return COMMAND_CENTER_HEALTH_VALUES.some((h) => h === v);
}

export const COMMAND_CENTER_SCOPE_VALUES = [
  "all",
  "mine",
  "created",
  "subscribed",
] as const;

export type CommandCenterScope = (typeof COMMAND_CENTER_SCOPE_VALUES)[number];

export function isCommandCenterScope(v: string): v is CommandCenterScope {
  return COMMAND_CENTER_SCOPE_VALUES.some((s) => s === v);
}

export function resolveProjectsStatValue(
  count: number,
  hasMore: boolean,
): string | number {
  if (hasMore) return `${count}+`;
  return count;
}
