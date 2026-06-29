export const PLATFORM_OWNER_ROLE = "PLATFORM_OWNER" as const;

export function isPlatformOwner(role: string | null | undefined): boolean {
  return role === PLATFORM_OWNER_ROLE;
}

export const OWNER_HOME = "/owner";
