"use client";

import { useEffect, useRef } from "react";
import type { Session } from "next-auth";
import {
  SessionProvider as NextAuthSessionProvider,
  useSession,
} from "next-auth/react";
import { usePathname } from "next/navigation";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getMembershipLifecycleDestination } from "@/lib/membership-lifecycle-route";

function MembershipLifecycleSync() {
  const { data } = useSession();
  const pathname = usePathname();
  const previous = useRef({
    orgId: data?.orgId ?? null,
    access: data?.organizationAccess,
  });

  useEffect(() => {
    const current = {
      orgId: data?.orgId ?? null,
      access: data?.organizationAccess,
    };
    const orgChanged = previous.current.orgId !== current.orgId;
    const accessChanged = previous.current.access !== current.access;
    previous.current = current;

    if (!orgChanged && !accessChanged) return;
    clearBackendTokenCache();

    const destination = getMembershipLifecycleDestination(
      current.access,
      pathname,
    );
    if (destination) {
      window.location.replace(destination);
    }
  }, [data?.orgId, data?.organizationAccess, pathname]);

  return null;
}

const CLAIMS_BACKSTOP_POLL_SECONDS = 5 * 60;

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchInterval={CLAIMS_BACKSTOP_POLL_SECONDS}
    >
      <MembershipLifecycleSync />
      {children}
    </NextAuthSessionProvider>
  );
}
