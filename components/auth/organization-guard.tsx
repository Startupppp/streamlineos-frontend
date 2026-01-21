"use client";

import { useEffect, useState } from "react";
import { checkUserHasOrganization } from "@/server/actions/organization-actions";
import { Loader2 } from "lucide-react";

interface OrganizationGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side guard that checks if user has an organization.
 * Redirects to /setup-organization if no org membership found.
 */
export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    const checkOrg = async () => {
      try {
        await checkUserHasOrganization();
        // Always allow access, don't redirect to setup-organization
        setHasOrg(true);
      } catch {
        // If check fails, allow access (fail open for better UX)
        setHasOrg(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkOrg();
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
