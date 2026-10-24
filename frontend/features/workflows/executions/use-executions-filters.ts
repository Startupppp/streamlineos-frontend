"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ExecutionStatus } from "@/hooks/api/workflows";

const STATUS_VALUES = [
  "running",
  "completed",
  "failed",
  "pending",
  "cancelled",
] as const satisfies readonly ExecutionStatus[];

export type ExecutionStatusFilter = (typeof STATUS_VALUES)[number] | "all";

function parseStatus(raw: string | null): ExecutionStatusFilter {
  if (raw && (STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as ExecutionStatusFilter;
  }
  return "all";
}

export function useExecutionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const status = parseStatus(searchParams.get("status"));
  const cursor = searchParams.get("cursor");

  const navigate = useCallback(
    (apply: (params: URLSearchParams) => void) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        apply(params);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const setStatus = useCallback(
    (value: ExecutionStatusFilter) => {
      navigate((params) => {
        if (value === "all") params.delete("status");
        else params.set("status", value);
        params.delete("cursor");
      });
    },
    [navigate],
  );

  const setCursor = useCallback(
    (next: string | null) => {
      navigate((params) => {
        if (next) params.set("cursor", next);
        else params.delete("cursor");
      });
    },
    [navigate],
  );

  return { status, cursor, setStatus, setCursor };
}
