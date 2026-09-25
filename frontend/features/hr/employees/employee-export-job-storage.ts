"use client";

import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const EXPORT_JOB_KEY_NAME = "hr-employee-export-job";

/**
 * Ticket 04. An employee export is a server-side job; the id used to live only
 * in the directory page's component state, so navigating away abandoned a job
 * that was still running and its file became unreachable.
 *
 * The scope from `useOrgStorageScope` is already `<orgId>::<userId>`, so a
 * recovered id can never belong to another organisation or another person — and
 * `GET /hr/export/jobs/:id` is scoped to the requester on the server anyway, so a
 * hand-edited value is inert rather than a cross-tenant read.
 */
export function exportJobStorageKey(scope: string): string {
  return orgScopedStorageKey(EXPORT_JOB_KEY_NAME, scope);
}

export function loadExportJobId(scope: string): string | null {
  try {
    const raw = localStorage.getItem(exportJobStorageKey(scope));
    return raw && raw.length > 0 ? raw : null;
  } catch {
    // Private mode, blocked site data, or SSR: an export simply is not recovered.
    return null;
  }
}

export function saveExportJobId(scope: string, exportJobId: string): void {
  try {
    localStorage.setItem(exportJobStorageKey(scope), exportJobId);
  } catch {}
}

export function clearExportJobId(scope: string): void {
  try {
    localStorage.removeItem(exportJobStorageKey(scope));
  } catch {}
}
