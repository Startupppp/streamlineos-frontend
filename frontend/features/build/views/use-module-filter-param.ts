"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildListSearchParams } from "../shared/use-build-list-url-state";

export function useModuleFilterParam() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filterModule = searchParams.get("module") ?? "";

  const setModuleFilter = useCallback(
    (moduleId: string) => {
      const next = buildListSearchParams(
        searchParams,
        { module: moduleId || null },
        { resetCursor: true },
      );
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { filterModule, setModuleFilter };
}
