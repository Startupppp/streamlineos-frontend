"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPortalToken } from "@/lib/portal-api-client";

export function usePortalGuard(): { isReady: boolean } {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getPortalToken();
    if (!token) {
      router.replace("/portal/accept-invitation?reason=no_token");
      return;
    }
    setIsReady(true);
  }, [router]);

  return { isReady };
}
