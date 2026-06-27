"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { AbilityProvider, useAbility as useCaslAbility, Can } from "@casl/react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/lib/rbac/hooks";
import { defineAbilityFor, type AppAbility } from "@/lib/abilities";
import { queryKeys } from "@/lib/query-keys";

export { Can };

export function AbilityContextProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { permissions } = usePermissions();
  const queryClient = useQueryClient();

  const orgId = session?.orgId ?? null;
  const previousOrgIdRef = useRef<string | null>(orgId);

  useEffect(() => {
    const previousOrgId = previousOrgIdRef.current;
    if (orgId && previousOrgId && previousOrgId !== orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.access.me() });
    }
    previousOrgIdRef.current = orgId;
  }, [orgId, queryClient]);

  const ability = useMemo(
    () =>
      defineAbilityFor({
        isPlatformAdmin: session?.user?.isPlatformAdmin ?? false,
        isOrgOwner: session?.user?.isOrgOwner ?? false,
        permissions,
        enabledModules: session?.enabledModules ?? [],
      }),
    [
      session?.user?.isPlatformAdmin,
      session?.user?.isOrgOwner,
      session?.enabledModules,
      permissions,
    ],
  );

  return <AbilityProvider value={ability}>{children}</AbilityProvider>;
}

export function useAbility(): AppAbility {
  return useCaslAbility<AppAbility>();
}
