"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getPortalToken } from "@/lib/portal-api-client";

export function usePortalGuard(): { isReady: boolean } {
  const router = useRouter();
  const token = useMemo(() => getPortalToken(), []);

  useEffect(() => {
    if (!token) {
      router.replace("/portal/accept-invitation?reason=no_token");
    }
  }, [token, router]);

  return { isReady: !!token };
}
