"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

interface SourceOverride<S, V> {
  source: S;
  value: V;
}

function isUpdater<V>(action: SetStateAction<V>): action is (previous: V) => V {
  return typeof action === "function";
}

export function useSourceOverride<S, V>(
  source: S,
  fallback: V,
  hold = false,
): [V, Dispatch<SetStateAction<V>>] {
  const [override, setOverride] = useState<SourceOverride<S, V> | null>(null);
  const value =
    override !== null && (hold || Object.is(override.source, source))
      ? override.value
      : fallback;

  const setValue = useCallback(
    (action: SetStateAction<V>) => {
      setOverride((previous) => {
        const base =
          previous !== null && (hold || Object.is(previous.source, source))
            ? previous.value
            : fallback;
        return { source, value: isUpdater(action) ? action(base) : action };
      });
    },
    [source, fallback, hold],
  );

  return [value, setValue];
}
