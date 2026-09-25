"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Trailing-edge debounce with an escape hatch. `flush` publishes the pending
 * value at once and cancels the timer, so a search box can stay debounced while
 * Enter still searches immediately — without a second source of truth for the
 * query, which is how a keystroke-per-request regression creeps back in.
 */
export function useFlushableDebouncedValue<T>(
  value: T,
  delay: number = 300,
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState(value);
  // Read by `flush`, which must publish the newest value even when it fires in
  // the same tick as the keystroke that produced it.
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  const flush = useCallback(() => setDebouncedValue(latest.current), []);

  return [debouncedValue, flush];
}

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  return useFlushableDebouncedValue(value, delay)[0];
}
