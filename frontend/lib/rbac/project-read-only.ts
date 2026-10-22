"use client";

import { createContext } from "react";

export const ProjectReadOnlyContext = createContext(false);

const STILL_ALLOWED: ReadonlySet<string> = new Set(["build:ai:use"]);

export function blockedForProjectViewer(permissionKey: string): boolean {
  if (!permissionKey.startsWith("build:")) return false;
  if (permissionKey.endsWith(":view") || permissionKey.endsWith(":read")) return false;
  return !STILL_ALLOWED.has(permissionKey);
}
