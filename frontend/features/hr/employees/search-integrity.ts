"use client";

import { useState } from "react";

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

  if (isSettled && !isSearching && rowCount > 0 && !knownNonEmptyScopes.has(scopeKey)) {
    setKnownNonEmptyScopes(new Set(knownNonEmptyScopes).add(scopeKey));
  }

  return searchIntegrityFailed(knownNonEmptyScopes, input);
}
