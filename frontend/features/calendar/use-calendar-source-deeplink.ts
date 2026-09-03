"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCalendarSources,
  useSetCalendarSourcePreference,
} from "@/hooks/api/calendar";

/**
 * `/calendar?source=<key>` is how a module page hands its events to the one
 * unified calendar instead of rendering a calendar of its own. The source is a
 * per-user preference, so a viewer who had it switched off would otherwise
 * follow the link and land on a calendar with nothing on it.
 *
 * Only ever enables, never disables — a deep link is an "also show me this",
 * not a filter — and the param is stripped either way so a reload or a
 * back-navigation cannot re-apply it after the user toggles the source off.
 */
export function useCalendarSourceDeepLink(): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedKey = searchParams.get("source");
  const { data: sources } = useCalendarSources();
  const { mutate: setPreference } = useSetCalendarSourcePreference();
  const consumedRef = useRef<string | null>(null);

  useEffect(() => {
    if (requestedKey === null) return;
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
  }, [requestedKey, searchParams, sources, setPreference, router]);
}
