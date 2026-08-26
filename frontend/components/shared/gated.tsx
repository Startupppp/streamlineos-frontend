"use client";

import type { ReactNode } from "react";
import { useCanState } from "@/hooks/api/access";
import { resolveGate, type GateState } from "@/lib/rbac/gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { ErrorState } from "./error-state";
import { NoPermissionState } from "./no-permission-state";

/**
 * A gated surface's five states, in one component that cannot get the order
 * wrong.
 *
 * Ticket 26's fix is `resolveGate`; this is the thing that makes using it the
 * path of least resistance. The bug it closes was not a mistake anybody made
 * once -- twenty-one files independently wrote the same four-branch ternary and
 * all twenty-one put `isLoading` above emptiness and neither above denial,
 * because that is the obvious order until you know that a *disabled* query
 * reports `isLoading: false`. Leaving the branch order at each call site leaves
 * the twenty-second file free to get it wrong the same way.
 *
 * Deliberately takes the query's flags rather than the query object: a screen
 * often gates on one permission while showing several queries, and "is this
 * empty" is a question only the screen can answer -- an empty page of results is
 * not an empty list, and a filtered list with no matches is not an empty one
 * either.
 */
export interface GatedProps {
  /** The permission this surface reads through. */
  permission: PermissionKey;
  isLoading: boolean;
  isError?: boolean;
  /** Whether the loaded result has anything in it. Omit if the surface is not a list. */
  isEmpty?: boolean;
  /** Shown while rights or data are in flight. A skeleton belongs here. */
  loading: ReactNode;
  /** Shown when the caller may look and there is nothing to see. */
  empty?: ReactNode;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  children: ReactNode;
}

export function Gated({
  permission,
  isLoading,
  isError = false,
  isEmpty = false,
  loading,
  empty,
  error,
  onRetry,
  className,
  children,
}: GatedProps) {
  const state = resolveGate({
    access: useCanState(permission),
    isLoading,
    isError,
    isEmpty,
  });

  switch (state) {
    case "loading":
      return <>{loading}</>;
    case "denied":
      return <NoPermissionState permission={permission} className={className} />;
    case "error":
      return <>{error ?? <ErrorState onRetry={onRetry} className={className} />}</>;
    case "empty":
      // A surface with nothing to show and no empty state of its own renders its
      // children, which is what a non-list surface wants: "empty" is not a
      // meaningful state for a detail page or a form.
      return <>{empty ?? children}</>;
    case "ready":
      return <>{children}</>;
  }
}

export type { GateState };
