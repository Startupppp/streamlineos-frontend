"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { skippedGrantItemContract, type SkippedGrant } from "@/hooks/common/auth-schema";

export const PARTIAL_GRANTS_KEY = "streamline:join:partial-grants";

const MODULE_LABELS: Record<string, string> = {
  build: "Build",
  hr: "HR",
  crm: "CRM",
  kb: "Knowledge Base",
  helpdesk: "Help Desk",
};

const REASON_TEXT: Record<SkippedGrant["reason"], string> = {
  INVITER_AUTHORITY_REVOKED: "The person who invited you can no longer grant this access.",
  ROLE_NOT_SEEDED: "The role you were invited with no longer exists in this organization.",
};

const storedGrantsContract = z.array(skippedGrantItemContract);

function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key;
}

function readStoredGrants(): SkippedGrant[] {
  try {
    const stored = sessionStorage.getItem(PARTIAL_GRANTS_KEY);
    sessionStorage.removeItem(PARTIAL_GRANTS_KEY);
    if (!stored) return [];
    const parsed = storedGrantsContract.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function persistPartialGrants(skippedGrants: SkippedGrant[]): void {
  try {
    if (skippedGrants.length === 0) {
      sessionStorage.removeItem(PARTIAL_GRANTS_KEY);
    } else {
      sessionStorage.setItem(PARTIAL_GRANTS_KEY, JSON.stringify(skippedGrants));
    }
  } catch {
    return;
  }
}

interface PostInviteTransitionProps {
  destination: string;
}

export function PostInviteTransition({ destination }: PostInviteTransitionProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const destinationRef = useRef(destination);
  destinationRef.current = destination;

  const [skippedGrants, setSkippedGrants] = useState<SkippedGrant[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const grants = readStoredGrants();
    if (grants.length === 0) {
      routerRef.current.replace(destinationRef.current);
      return;
    }
    setSkippedGrants(grants);
    setLoaded(true);
  }, []);

  function handleContinue() {
    router.replace(destination);
  }

  if (!loaded) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Some module access could not be granted
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the person who invited you or an org admin to grant the access below directly.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={handleContinue}
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-4 space-y-1.5">
          {skippedGrants.map((g) => (
            <li
              key={g.module}
              className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-sm text-status-warning-ink"
            >
              <span className="font-medium">{moduleLabel(g.module)}</span>
              <span className="mt-0.5 block text-xs">{REASON_TEXT[g.reason]}</span>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          className="mt-5 w-full"
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
