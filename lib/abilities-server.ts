import "server-only";
import { auth } from "@/lib/auth";
import { defineAbilityFor, emptyAbility, type AppAbility } from "@/lib/abilities";

export async function getSessionAbility(): Promise<AppAbility> {
  const session = await auth();
  if (!session?.user) return emptyAbility();
  return defineAbilityFor({
    isPlatformAdmin: session.user.isPlatformAdmin ?? false,
    isOrgOwner: session.user.isOrgOwner ?? false,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
  });
}
