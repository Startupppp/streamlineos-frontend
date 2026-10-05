"use client";

import { useCallback, useEffect, useMemo } from "react";
import { countBuildScopePins } from "@/lib/build/build-nav-model";
import { BUILD_NAV_MAX_PINS } from "@/lib/build/nav/build-nav-destination";
import {
  useStoredJson,
  parseBoolean,
  parseIds,
  parseScopeRefs,
  type BuildScopeRef,
} from "./build-nav-storage";

export const BUILD_SCOPE_RECENTS_LIMIT = 6;
export const BUILD_SCOPE_STARS_LIMIT = 20;

const PINS_STORAGE_NAME = "build-nav-pins";
const STARS_STORAGE_NAME = "build-scope-stars";
const RECENTS_STORAGE_NAME = "build-scope-recents";
const COLLAPSED_STORAGE_NAME = "build-nav-collapsed";

const EMPTY_IDS: readonly string[] = [];
const EMPTY_SCOPES: readonly BuildScopeRef[] = [];

export function useBuildNavPins(
  authorizedToolIds: readonly string[],
  isAccessResolved: boolean,
): {
  pinnedIds: readonly string[];
  isPinned: (toolId: string) => boolean;
  canPinMore: boolean;
  togglePin: (toolId: string) => void;
  reorderPins: (next: readonly string[]) => void;
} {
  const { value: pinnedIds, write } = useStoredJson(
    PINS_STORAGE_NAME,
    parseIds,
    EMPTY_IDS,
  );

  const scopePinCount = useMemo(
    () => countBuildScopePins(pinnedIds, authorizedToolIds),
    [pinnedIds, authorizedToolIds],
  );

  const isPinned = useCallback(
    (toolId: string) => pinnedIds.includes(toolId),
    [pinnedIds],
  );

  const togglePin = useCallback(
    (toolId: string) => {
      if (pinnedIds.includes(toolId)) {
        write(pinnedIds.filter((id) => id !== toolId));
        return;
      }
      if (scopePinCount >= BUILD_NAV_MAX_PINS) return;
      write([...pinnedIds, toolId]);
    },
    [pinnedIds, scopePinCount, write],
  );

  useEffect(() => {
    if (!isAccessResolved) return;
    const authorized = new Set(authorizedToolIds);
    const pruned = pinnedIds.filter((id) => authorized.has(id));
    if (pruned.length === pinnedIds.length) return;
    write(pruned);
  }, [isAccessResolved, authorizedToolIds, pinnedIds, write]);

  const reorderPins = useCallback(
    (next: readonly string[]) => {
      const authorized = new Set(authorizedToolIds);
      write(next.filter((id) => authorized.has(id)).slice(0, BUILD_NAV_MAX_PINS));
    },
    [authorizedToolIds, write],
  );

  return {
    pinnedIds,
    isPinned,
    canPinMore: scopePinCount < BUILD_NAV_MAX_PINS,
    togglePin,
    reorderPins,
  };
}

export function useBuildNavCollapsed(): {
  isCollapsed: boolean;
  setCollapsed: (next: boolean) => void;
} {
  const { value: isCollapsed, write } = useStoredJson(
    COLLAPSED_STORAGE_NAME,
    parseBoolean,
    false,
  );

  const setCollapsed = useCallback(
    (next: boolean) => write(next),
    [write],
  );

  return { isCollapsed, setCollapsed };
}

export function useBuildScopeStars(): {
  starred: readonly BuildScopeRef[];
  isStarred: (scopeKey: string) => boolean;
  toggleStar: (scope: BuildScopeRef) => void;
  replaceStarred: (next: readonly BuildScopeRef[]) => void;
} {
  const { value: starred, write } = useStoredJson(
    STARS_STORAGE_NAME,
    parseScopeRefs,
    EMPTY_SCOPES,
  );

  const isStarred = useCallback(
    (scopeKey: string) => starred.some((entry) => entry.key === scopeKey),
    [starred],
  );

  const toggleStar = useCallback(
    (scope: BuildScopeRef) => {
      if (scope.type === "organization") return;
      if (starred.some((entry) => entry.key === scope.key)) {
        write(starred.filter((entry) => entry.key !== scope.key));
        return;
      }
      write([scope, ...starred].slice(0, BUILD_SCOPE_STARS_LIMIT));
    },
    [starred, write],
  );

  const replaceStarred = useCallback(
    (next: readonly BuildScopeRef[]) => write(next),
    [write],
  );

  return { starred, isStarred, toggleStar, replaceStarred };
}

export function useBuildScopeRecents(): {
  recents: readonly BuildScopeRef[];
  recordScope: (scope: BuildScopeRef) => void;
  replaceRecents: (next: readonly BuildScopeRef[]) => void;
} {
  const { value: recents, write } = useStoredJson(
    RECENTS_STORAGE_NAME,
    parseScopeRefs,
    EMPTY_SCOPES,
  );

  const recordScope = useCallback(
    (scope: BuildScopeRef) => {
      if (scope.type === "organization") return;
      const head = recents[0];
      if (head?.key === scope.key && head.name === scope.name) return;
      write(
        [scope, ...recents.filter((entry) => entry.key !== scope.key)].slice(
          0,
          BUILD_SCOPE_RECENTS_LIMIT,
        ),
      );
    },
    [recents, write],
  );

  const replaceRecents = useCallback(
    (next: readonly BuildScopeRef[]) => write(next),
    [write],
  );

  return { recents, recordScope, replaceRecents };
}
