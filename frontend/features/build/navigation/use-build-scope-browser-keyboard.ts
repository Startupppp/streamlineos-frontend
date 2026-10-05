"use client";

import { useCallback, type RefObject, type KeyboardEvent } from "react";
import type { BuildScopeDirectoryEntry } from "./use-build-scope-directory";

interface UseBuildScopeBrowserKeyboardParams {
  listRef: RefObject<HTMLDivElement | null>;
  treeRef: RefObject<HTMLDivElement | null>;
  expandedKeys: ReadonlySet<string>;
  onToggleExpanded: (key: string) => void;
  childrenOf: (key: string) => BuildScopeDirectoryEntry[];
  directoryProducts: BuildScopeDirectoryEntry[];
  directoryProjects: BuildScopeDirectoryEntry[];
}

interface UseBuildScopeBrowserKeyboardResult {
  handleListKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleSearchKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function useBuildScopeBrowserKeyboard({
  listRef,
  treeRef,
  expandedKeys,
  onToggleExpanded,
  childrenOf,
  directoryProducts,
  directoryProjects,
}: UseBuildScopeBrowserKeyboardParams): UseBuildScopeBrowserKeyboardResult {
  const moveFocus = useCallback(
    (step: number) => {
      const container = listRef.current;
      if (!container) return false;
      const items = [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[role="option"], [role="treeitem"]',
        ),
      ];
      if (items.length === 0) return false;
      const current = items.findIndex(
        (item) => item === document.activeElement,
      );
      const nextIndex =
        current === -1
          ? step > 0
            ? 0
            : items.length - 1
          : (current + step + items.length) % items.length;
      items[nextIndex]?.focus();
      return true;
    },
    [listRef],
  );

  const handleListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      if (key === "ArrowDown" || key === "ArrowUp") {
        if (moveFocus(key === "ArrowDown" ? 1 : -1)) event.preventDefault();
        return;
      }
      const container = listRef.current;
      if (!container) return;
      if (key === "Home") {
        const first = container.querySelector<HTMLButtonElement>(
          '[role="option"], [role="treeitem"]',
        );
        if (first) {
          first.focus();
          event.preventDefault();
        }
        return;
      }
      if (key === "End") {
        const all = container.querySelectorAll<HTMLButtonElement>(
          '[role="option"], [role="treeitem"]',
        );
        const last = all[all.length - 1];
        if (last) {
          last.focus();
          event.preventDefault();
        }
        return;
      }
      if (key === "ArrowRight" || key === "ArrowLeft") {
        const focused = document.activeElement;
        const tree = treeRef.current;
        if (!(focused instanceof HTMLElement) || !tree?.contains(focused))
          return;
        const scopeKey = focused.dataset["scopeKey"];
        if (!scopeKey) return;
        if (key === "ArrowRight") {
          const hasChildren = childrenOf(scopeKey).length > 0;
          if (hasChildren && !expandedKeys.has(scopeKey)) {
            onToggleExpanded(scopeKey);
            event.preventDefault();
          } else if (hasChildren && expandedKeys.has(scopeKey)) {
            moveFocus(1);
            event.preventDefault();
          }
        }
        if (key === "ArrowLeft" && expandedKeys.has(scopeKey)) {
          onToggleExpanded(scopeKey);
          event.preventDefault();
        } else if (key === "ArrowLeft") {
          const parentKey = [...directoryProducts, ...directoryProjects].find(
            (entry) => entry.key === scopeKey,
          )?.parentKey;
          if (!parentKey) return;
          const parent = [
            ...tree.querySelectorAll<HTMLButtonElement>(
              '[role="treeitem"][data-scope-key]',
            ),
          ].find((item) => item.dataset["scopeKey"] === parentKey);
          if (parent) {
            parent.focus();
            event.preventDefault();
          }
        }
      }
    },
    [
      moveFocus,
      expandedKeys,
      onToggleExpanded,
      childrenOf,
      listRef,
      treeRef,
      directoryProducts,
      directoryProjects,
    ],
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowDown") return;
      if (moveFocus(1)) event.preventDefault();
    },
    [moveFocus],
  );

  return { handleListKeyDown, handleSearchKeyDown };
}
