"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { installGlobalErrorHandlers, setSessionContext } from "@/lib/observability";

/**
 * Turns on error reporting for the browser.
 *
 * Two jobs: catch the failures React never sees (an error thrown outside a
 * render, a promise nobody awaited), and keep the signed-in organisation
 * attached to whatever gets reported, so a report can be traced to a customer
 * rather than arriving anonymous.
 *
 * Renders nothing.
 */
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
