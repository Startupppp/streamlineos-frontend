"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getPortalToken } from "@/lib/portal-api-client";

export function usePortalGuard(): { isReady: boolean } {
  const router = useRouter();
  const token = useMemo(() => getPortalToken(), []);

  useEffect(() => {
    if (!token) {
      // `(portal)` is a route group and adds no URL segment, so the invitation page at
      // app/(portal)/accept-invitation answers `/accept-invitation`. `/portal/accept-invitation`
      // matched app/(authenticated)/portal/[projectId] instead and dumped the client on
      // /signin?session=expired.
      router.replace("/accept-invitation?reason=no_token");
    }
  }, [token, router]);

  return { isReady: !!token };
}
