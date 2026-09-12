"use client";

import { useCallback, useRef } from "react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";

export const SESSION_CLAIMS_UNCONFIRMED_MESSAGE =
  "Your session could not be refreshed. Reload the page before continuing.";

export interface ExpectedSessionClaims {
  orgId?: string | null;
  name?: string;
}

export type SessionClaimsOutcome =
  | { status: "confirmed"; session: Session }
  | { status: "superseded" }
  | { status: "unconfirmed" };

export interface SessionClaimsRefreshRun {
  confirm: (expected?: ExpectedSessionClaims) => Promise<SessionClaimsOutcome>;
  confirmOrWarn: (expected?: ExpectedSessionClaims) => Promise<boolean>;
}

export type BeginSessionClaimsRefresh = () => SessionClaimsRefreshRun;

export function matchesExpectedSessionClaims(
  session: Session,
  expected: ExpectedSessionClaims | undefined,
): boolean {
  if (!expected) return true;
  if ("orgId" in expected && (session.orgId ?? null) !== (expected.orgId ?? null))
    return false;
  if (expected.name !== undefined && session.user.name !== expected.name)
    return false;
  return true;
}

export function useConfirmedSessionClaimsRefresh(): BeginSessionClaimsRefresh {
  const refreshSessionClaims = useSessionClaimsRefresh();
  const generationRef = useRef(0);

  return useCallback(() => {
    generationRef.current += 1;
    const generation = generationRef.current;

    const confirm = async (
      expected?: ExpectedSessionClaims,
    ): Promise<SessionClaimsOutcome> => {
      const refreshed = await refreshSessionClaims(expected);
      if (generation !== generationRef.current) return { status: "superseded" };
      if (!refreshed) return { status: "unconfirmed" };
      if (!matchesExpectedSessionClaims(refreshed, expected))
        return { status: "unconfirmed" };
      return { status: "confirmed", session: refreshed };
    };

    const confirmOrWarn = async (
      expected?: ExpectedSessionClaims,
    ): Promise<boolean> => {
      const outcome = await confirm(expected);
      if (outcome.status === "unconfirmed")
        toast.error(SESSION_CLAIMS_UNCONFIRMED_MESSAGE);
      return outcome.status === "confirmed";
    };

    return { confirm, confirmOrWarn };
  }, [refreshSessionClaims]);
}
