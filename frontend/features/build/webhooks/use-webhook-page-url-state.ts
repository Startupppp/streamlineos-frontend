"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BUILD_CURSOR_STACK_PARAM } from "@/features/build/shared/use-build-cursor-pager";

export interface WebhookPageUrlState {
  stateParam: "active" | "inactive" | null;
  eventParam: string | undefined;
  qParam: string | undefined;
  fromParam: string | undefined;
  toParam: string | undefined;
  qInput: string;
  updateUrl: (next: Record<string, string | undefined>) => void;
  handleStateChange: (value: string) => void;
  handleEventChange: (value: string) => void;
  handleFromChange: (value: string) => void;
  handleToChange: (value: string) => void;
  handleQChange: (value: string) => void;
}

export function useWebhookPageUrlState(): WebhookPageUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStateParam = searchParams.get("state");
  const stateParam: "active" | "inactive" | null =
    rawStateParam === "active" || rawStateParam === "inactive"
      ? rawStateParam
      : null;
  const eventParam = searchParams.get("event") ?? undefined;
  const qParam = searchParams.get("q") ?? undefined;
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;

  const [qInput, setQInput] = useState(qParam ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateUrl = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete(BUILD_CURSOR_STACK_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleStateChange = useCallback(
    (value: string) => {
      updateUrl({ state: value === "all" ? undefined : value });
    },
    [updateUrl],
  );

  const handleEventChange = useCallback(
    (value: string) => {
      updateUrl({ event: value === "all" ? undefined : value });
    },
    [updateUrl],
  );

  const handleFromChange = useCallback(
    (value: string) => {
      updateUrl({ from: value || undefined });
    },
    [updateUrl],
  );

  const handleToChange = useCallback(
    (value: string) => {
      updateUrl({ to: value || undefined });
    },
    [updateUrl],
  );

  const handleQChange = useCallback(
    (value: string) => {
      setQInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateUrl({ q: value || undefined });
      }, 300);
    },
    [updateUrl],
  );

  return {
    stateParam,
    eventParam,
    qParam,
    fromParam,
    toParam,
    qInput,
    updateUrl,
    handleStateChange,
    handleEventChange,
    handleFromChange,
    handleToChange,
    handleQChange,
  };
}
