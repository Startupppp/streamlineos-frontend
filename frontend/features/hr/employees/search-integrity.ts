"use client";

import { useEffect, useState } from "react";

export const SEARCH_INTEGRITY_MESSAGE =
  "Search failed integrity check — showing unfiltered. Report ref HRMS-SEARCH-001.";

export interface EmployeeSearchScope {
  departmentId?: string;
  isActive?: string;
  role?: string;
}

export function employeeSearchScopeKey(scope: EmployeeSearchScope): string {
  return [scope.departmentId ?? "", scope.isActive ?? "all", scope.role ?? ""].join("|");
}

export interface SearchIntegrityInput {
  scopeKey: string;
  isSearching: boolean;
  isSettled: boolean;
  rowCount: number;
}

export function searchIntegrityFailed(
  knownNonEmptyScopes: ReadonlySet<string>,
  { scopeKey, isSearching, isSettled, rowCount }: SearchIntegrityInput,
): boolean {
  if (!isSettled || !isSearching || rowCount > 0) return false;
  return knownNonEmptyScopes.has(scopeKey);
}

export function useSearchIntegrity(input: SearchIntegrityInput): boolean {
  const [knownNonEmptyScopes, setKnownNonEmptyScopes] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const { scopeKey, isSearching, isSettled, rowCount } = input;

  useEffect(() => {
    if (!isSettled || isSearching || rowCount === 0) return;
    // A settled query is an external observation; retain it for later integrity checks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnownNonEmptyScopes((known) =>
      known.has(scopeKey) ? known : new Set(known).add(scopeKey),
    );
  }, [isSearching, isSettled, rowCount, scopeKey]);

  return searchIntegrityFailed(knownNonEmptyScopes, input);
}
