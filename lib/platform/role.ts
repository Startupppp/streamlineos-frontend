export const PLATFORM_OWNER_ROLE = "PLATFORM_OWNER" as const;
export type PlatformOwnerRole = typeof PLATFORM_OWNER_ROLE;

export function isPlatformOwner(role: string | null | undefined): boolean {
  return role === PLATFORM_OWNER_ROLE;
}

export const OWNER_ROUTE_PREFIX = "/owner";

export const OWNER_HOME = "/owner";
