"use client";

import { createContext } from "react";

/**
 * True inside a Build project the caller reaches as a VIEWER (the project
 * detail response's `readOnly`). The backend refuses every project-scoped
 * Build write for them with 403 PROJECT_VIEWER_READ_ONLY, so `useCan` answers
 * false for the write keys here and every gated control hides on its own.
 */
export const ProjectReadOnlyContext = createContext(false);

// AI drafting generates text and writes nothing, so the backend leaves it open.
const STILL_ALLOWED: ReadonlySet<string> = new Set(["build:ai:use"]);

export function blockedForProjectViewer(permissionKey: string): boolean {
  if (!permissionKey.startsWith("build:")) return false;
  if (permissionKey.endsWith(":view") || permissionKey.endsWith(":read")) return false;
  return !STILL_ALLOWED.has(permissionKey);
}
