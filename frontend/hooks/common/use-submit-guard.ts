"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SubmitGuard<TArgs extends unknown[]> {
  submit: (...args: TArgs) => Promise<void>;
  isSubmitting: boolean;
  isInFlight: () => boolean;
}

export function useSubmitGuard<TArgs extends unknown[]>(
  handler: (...args: TArgs) => unknown | Promise<unknown>,
): SubmitGuard<TArgs> {
  const inFlight = useRef(false);
  const alive = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const submit = useCallback(
    async (...args: TArgs) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        await handler(...args);
      } finally {
        inFlight.current = false;
        if (alive.current) setIsSubmitting(false);
      }
    },
    [handler],
  );

  const isInFlight = useCallback(() => inFlight.current, []);

  return { submit, isSubmitting, isInFlight };
}
