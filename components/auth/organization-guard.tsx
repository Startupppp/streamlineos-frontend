"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { checkUserHasOrganization } from "@/server/actions/organization-actions";
import Image from "next/image";

const ORG_CACHE_KEY = "vaivamm_org_verified";

interface OrganizationGuardProps {
  children: React.ReactNode;
}
export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const { status } = useSession();
  const [isChecking, setIsChecking] = useState(() => {
    // If already verified this browser session, start as ready immediately
    if (typeof window !== "undefined" && sessionStorage.getItem(ORG_CACHE_KEY) === "true") {
      return false;
    }
    return true;
  });
  const [hasOrg, setHasOrg] = useState(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(ORG_CACHE_KEY) === "true") {
      return true;
    }
    return false;
  });
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current || !isChecking) return;
    didRun.current = true;

    // Wait for session to be ready before checking org
    if (status === "loading") return;

    // If not authenticated, skip the org check
    if (status === "unauthenticated") {
      setIsChecking(false);
      setHasOrg(true); // Let NextAuth middleware handle redirect
      return;
    }

    let cancelled = false;
    const checkOrg = async () => {
      try {
        await checkUserHasOrganization();
        if (!cancelled) {
          setHasOrg(true);
          sessionStorage.setItem(ORG_CACHE_KEY, "true");
        }
      } catch {
        if (!cancelled) setHasOrg(true);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    checkOrg();
    return () => { cancelled = true; };
  }, [status, isChecking]);

  // Re-trigger if status changed from loading to authenticated
  useEffect(() => {
    if (status === "authenticated" && isChecking && !didRun.current) {
      didRun.current = false; // Allow the check to run
    }
  }, [status, isChecking]);

  if (isChecking) {
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
            0% {
              width: 0%;
              margin-left: 0%;
            }
            50% {
              width: 60%;
              margin-left: 20%;
            }
            100% {
              width: 0%;
              margin-left: 100%;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!hasOrg) {
    return null;
  }

  return <>{children}</>;
}
