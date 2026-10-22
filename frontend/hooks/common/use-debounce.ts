"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useFlushableDebouncedValue<T>(
  value: T,
  delay: number = 300,
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
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
