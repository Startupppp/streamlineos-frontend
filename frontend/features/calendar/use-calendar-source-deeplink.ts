"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCalendarSources,
  useSetCalendarSourcePreference,
} from "@/hooks/api/calendar";

export function useCalendarSourceDeepLink(enabled = true): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedKey = searchParams.get("source");
  const { data: sources } = useCalendarSources(enabled);
  const { mutate: setPreference } = useSetCalendarSourcePreference();
  const consumedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || requestedKey === null) return;
    if (consumedRef.current === requestedKey) return;
    if (sources === undefined) return;

    consumedRef.current = requestedKey;

    const match = sources.find((source) => source.key === requestedKey);
    if (match !== undefined && !match.enabled)
      setPreference({ sourceKey: requestedKey, enabled: true });

    const next = new URLSearchParams(searchParams.toString());
    next.delete("source");
    const rest = next.toString();
    router.replace(rest.length > 0 ? `/calendar?${rest}` : "/calendar");
  }, [enabled, requestedKey, searchParams, sources, setPreference, router]);
}
