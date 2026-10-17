"use client";

import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const STORAGE_PREFIX = "streamlineos:build:issues-filter:v1:";

const ISSUES_FILTER_PARAMS: readonly string[] = [
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "cycle",
  "module",
  "dueDateFrom",
  "dueDateTo",
  "severity",
  "qaState",
];

interface ReadableParams {
  get(key: string): string | null;
}

export function buildIssuesFilterQuery(searchParams: ReadableParams): string {
  const result = new URLSearchParams();
  for (const key of ISSUES_FILTER_PARAMS) {
    const value = searchParams.get(key);
    if (value) result.set(key, value);
  }
  return result.toString();
}

function issuesFilterStorageKey(projectId: number, scope: string): string {
  return orgScopedStorageKey(`${STORAGE_PREFIX}${projectId}`, scope);
}

export function saveIssuesFilterQuery(
  projectId: number,
  query: string,
  scope: string,
): void {
  try {
    sessionStorage.setItem(issuesFilterStorageKey(projectId, scope), query);
  } catch {}
}

export function loadIssuesFilterQuery(
  projectId: number,
  scope: string,
): string | null {
  try {
    return sessionStorage.getItem(issuesFilterStorageKey(projectId, scope));
  } catch {
    return null;
  }
}
