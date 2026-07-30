import "server-only";
import { getServerAuth } from "@/lib/get-server-auth";
import { defineAbilityFor, emptyAbility, type AppAbility } from "@/lib/abilities";

export async function getSessionAbility(): Promise<AppAbility> {
  const session = await getServerAuth();
  if (!session?.user) return emptyAbility();
  return defineAbilityFor({
    isOrgOwner: session.user.isOrgOwner ?? false,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
  });
}
