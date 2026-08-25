"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startOfMonth } from "date-fns";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { AgingBasis, AgingSide, LabelMode } from "@/types/accounting-reports";

export interface ReportControls {
  labelMode: LabelMode;
  asOf: string;
  from: string;
  to: string;
  comparative: boolean;
  includeZeroActivity: boolean;
  side: AgingSide;
  basis: AgingBasis;
  setLabelMode: (mode: LabelMode) => void;
  setAsOf: (value: string) => void;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  setComparative: (value: boolean) => void;
  setIncludeZeroActivity: (value: boolean) => void;
  setSide: (value: AgingSide) => void;
  setBasis: (value: AgingBasis) => void;
}

function readLabelMode(value: string | null): LabelMode {
  return value === "accountant" ? "accountant" : "founder";
}

export function useReportControls(): ReportControls {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = getTodayString();
  const monthStart = formatDateOnly(startOfMonth(new Date()));

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) params.delete(key);
      else params.set(key, value);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setLabelMode = useCallback(
    (mode: LabelMode) => setParam("labels", mode === "founder" ? null : mode),
    [setParam],
  );
  const setAsOf = useCallback((value: string) => setParam("asOf", value || null), [setParam]);
  const setFrom = useCallback((value: string) => setParam("from", value || null), [setParam]);
  const setTo = useCallback((value: string) => setParam("to", value || null), [setParam]);
  const setComparative = useCallback(
    (value: boolean) => setParam("comparative", value ? "1" : null),
    [setParam],
  );
  const setIncludeZeroActivity = useCallback(
    (value: boolean) => setParam("allAccounts", value ? "1" : null),
    [setParam],
  );
  const setSide = useCallback(
    (value: AgingSide) => setParam("side", value === "ar" ? null : value),
    [setParam],
  );
  const setBasis = useCallback(
    (value: AgingBasis) => setParam("basis", value === "due" ? null : value),
    [setParam],
  );

  return {
    labelMode: readLabelMode(searchParams.get("labels")),
    asOf: searchParams.get("asOf") ?? today,
    from: searchParams.get("from") ?? monthStart,
    to: searchParams.get("to") ?? today,
    comparative: searchParams.get("comparative") === "1",
    includeZeroActivity: searchParams.get("allAccounts") === "1",
    side: searchParams.get("side") === "ap" ? "ap" : "ar",
    basis: searchParams.get("basis") === "issue" ? "issue" : "due",
    setLabelMode,
    setAsOf,
    setFrom,
    setTo,
    setComparative,
    setIncludeZeroActivity,
    setSide,
    setBasis,
  };
}
