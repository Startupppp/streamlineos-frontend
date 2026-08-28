"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { UNAUTHENTICATED_SCOPE } from "@/lib/query-scope";

export const UNSCOPED: string = UNAUTHENTICATED_SCOPE;

const OrgStorageScopeContext = createContext<string>(UNSCOPED);

export function OrgStorageScopeProvider({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  return (
    <OrgStorageScopeContext.Provider value={scope}>
      {children}
    </OrgStorageScopeContext.Provider>
  );
}

export function useOrgStorageScope(): string {
  return useContext(OrgStorageScopeContext);
}

export function orgScopedStorageKey(name: string, scope: string): string {
  return `${scope}::${name}`;
}
