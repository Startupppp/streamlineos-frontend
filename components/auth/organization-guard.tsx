"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkUserHasOrganization } from "@/server/actions/organization-actions";
import Image from "next/image";

const ORG_CACHE_KEY = "vaivamm_org_verified";

function isCachedInSession(): boolean {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(ORG_CACHE_KEY) === "true";
  } catch {
    return false;
  }
}

interface OrganizationGuardProps {
  children: React.ReactNode;
}

export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const { status } = useSession();
  const [ready, setReady] = useState(isCachedInSession);

  useEffect(() => {
    // Already resolved — nothing to do
    if (ready) return;

    // Still waiting for NextAuth session — don't call server action yet
    if (status === "loading") return;

    // Not logged in — let middleware redirect, just unblock rendering
    if (status === "unauthenticated") {
      setReady(true);
      return;
    }

    // Authenticated — verify org membership once
    let cancelled = false;
    checkUserHasOrganization()
      .then(() => {
        if (!cancelled) {
          try { sessionStorage.setItem(ORG_CACHE_KEY, "true"); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => { cancelled = true; };
  }, [status, ready]);

  if (ready) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="relative h-16 w-16 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Image
              src="/logo.svg"
              alt="Vaivamm"
              width={36}
              height={36}
              className="select-none"
              priority
            />
          </div>
        </div>

        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              animation: "loading-bar 1.5s ease-in-out infinite",
            }}
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Vaivamm Capital</p>
          <p className="text-xs text-muted-foreground mt-1">Setting up your workspace...</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
