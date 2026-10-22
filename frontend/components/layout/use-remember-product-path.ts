"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";
import { getProductFromPathname } from "./sidebar/sidebar-nav-items";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  buildProductLocation,
  shouldRememberProductPath,
  writeLastProductPath,
} from "./last-product-path";

export function useRememberProductPath(): void {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const scope = useOrgStorageScope();
  const search = searchParams.toString();

  useEffect(() => {
    if (!shouldRememberProductPath(pathname)) return;
    const product = getProductFromPathname(pathname);
    const href = buildProductLocation(pathname, search);
    writeLastProductPath(
      orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, scope),
      product,
      href,
    );
  }, [pathname, search, scope]);
}
