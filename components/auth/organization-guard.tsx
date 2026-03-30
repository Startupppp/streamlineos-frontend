"use client";

import { useEffect, useRef, useState } from "react";
import { checkUserHasOrganization } from "@/server/actions/organization-actions";
import Image from "next/image";

const ORG_CACHE_KEY = "vaivamm_org_verified";

interface OrganizationGuardProps {
  children: React.ReactNode;
}
export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasOrg, setHasOrg] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    // If already verified this session, skip the async check entirely
    if (sessionStorage.getItem(ORG_CACHE_KEY) === "true") {
      setHasOrg(true);
      setIsChecking(false);
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
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-6">
          {/* Logo with pulse animation */}
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

          {/* Animated progress bar */}
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full animate-loading-bar"
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
