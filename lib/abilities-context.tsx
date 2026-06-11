"use client";

import { useMemo, type ReactNode } from "react";
import { AbilityProvider, useAbility as useCaslAbility, Can } from "@casl/react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/lib/rbac/hooks";
import { defineAbilityFor, type AppAbility } from "@/lib/abilities";

export { Can };

export function AbilityContextProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { permissions } = usePermissions();

  const ability = useMemo(
    () => defineAbilityFor({ role: session?.user?.role, permissions }),
    [session?.user?.role, permissions],
  );

  return <AbilityProvider value={ability}>{children}</AbilityProvider>;
}

export function useAbility(): AppAbility {
  return useCaslAbility<AppAbility>();
}
