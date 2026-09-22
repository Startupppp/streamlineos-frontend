"use client";

import { useEffect, useMemo } from "react";
import { useBuildScopeResolve } from "@/hooks/api/build/scope-directory";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
import type { BuildScopeResolvedRef } from "@/hooks/api/build/scope-directory";
import type { BuildScopeRef } from "./use-build-nav-preferences";

function hrefFor(ref: BuildScopeResolvedRef): string {
  if (ref.type === "workspace")
    return `${BUILD_ROOT_PATH}/workspaces/${ref.id}/overview`;
  if (ref.type === "product")
    return `${BUILD_ROOT_PATH}/managed-products/${ref.id}`;
  return `${BUILD_ROOT_PATH}/${ref.id}`;
}

function matchesStoredScopes(
  entries: readonly BuildScopeRef[],
  stored: readonly BuildScopeRef[],
): boolean {
  if (entries.length !== stored.length) return false;
  return entries.every((entry, index) => {
    const previous = stored[index];
    if (previous === undefined) return false;
    return (
      entry.key === previous.key &&
      entry.name === previous.name &&
      entry.parentKey === previous.parentKey &&
      entry.parentPath === previous.parentPath &&
      entry.projectKey === previous.projectKey &&
      entry.href === previous.href
    );
  });
}

export interface ReconciledBuildScopes {
  entries: readonly BuildScopeRef[];
  isReconciled: boolean;
}

export function useReconciledBuildScopes(
  stored: readonly BuildScopeRef[],
  onPrune: (next: readonly BuildScopeRef[]) => void,
): ReconciledBuildScopes {
  const keys = useMemo(() => stored.map((entry) => entry.key), [stored]);
  const { data, isSuccess } = useBuildScopeResolve(keys);

  const resolved = useMemo(() => {
    const byKey = new Map<string, BuildScopeResolvedRef>();
    for (const ref of data?.data ?? []) byKey.set(ref.key, ref);
    return byKey;
  }, [data]);

  const entries = useMemo<readonly BuildScopeRef[]>(() => {
    if (!isSuccess) return stored;
    const live: BuildScopeRef[] = [];
    for (const entry of stored) {
      const fresh = resolved.get(entry.key);
      if (fresh === undefined) continue;
      live.push({
        key: fresh.key,
        type: fresh.type,
        id: fresh.id,
        name: fresh.name,
        parentPath: fresh.parentPath,
        parentKey: fresh.parentKey,
        projectKey: fresh.projectKey,
        href: hrefFor(fresh),
      });
    }
    return live;
  }, [isSuccess, stored, resolved]);

  useEffect(() => {
    if (!isSuccess) return;
    if (matchesStoredScopes(entries, stored)) return;
    onPrune(entries);
  }, [isSuccess, entries, stored, onPrune]);

  return { entries, isReconciled: isSuccess };
}
