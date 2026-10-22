"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { installGlobalErrorHandlers, setSessionContext } from "@/lib/observability";

export function ObservabilityProvider(): null {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const actorId = session?.user?.id;

  useEffect(() => installGlobalErrorHandlers(), []);

  useEffect(() => {
    setSessionContext({ orgId: orgId ?? undefined, actorId });
  }, [orgId, actorId]);

  return null;
}
