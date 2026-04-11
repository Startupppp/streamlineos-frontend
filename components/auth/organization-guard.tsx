"use client";

import { useEffect, useRef, useState } from "react";
import { checkUserHasOrganization } from "@/server/actions/organization-actions";
import { Loader2 } from "lucide-react";

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
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasOrg) {
    return null;
  }

  return <>{children}</>;
}
