"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  isTicketDetailPathname,
  myWorkCollectionSearchParams,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import {
  useBuildListUrlState,
  type BuildListUrlStateOptions,
} from "@/features/build/shared/use-build-list-url-state";

export function useMyWorkSearchParams(): URLSearchParams {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(
    () => myWorkCollectionSearchParams(pathname, searchParams),
    [pathname, searchParams],
  );
}

export function useMyWorkListUrlState(
  options: Omit<BuildListUrlStateOptions, "searchParams" | "writePath"> = {},
) {
  const pathname = usePathname();
  const searchParams = useMyWorkSearchParams();
  return useBuildListUrlState({
    ...options,
    searchParams,
    writePath: isTicketDetailPathname(pathname) ? "/build/my-work" : pathname,
  });
}
