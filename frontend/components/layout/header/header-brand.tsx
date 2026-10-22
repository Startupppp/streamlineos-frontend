"use client";

import Link from "next/link";
import Image from "next/image";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  readLastProductPaths,
  resolveRememberedProductHref,
} from "../last-product-path";

const HOME_FALLBACK = "/dashboard";

interface HeaderBrandProps {
  showLabel?: boolean;
}

export function HeaderBrand({ showLabel = true }: HeaderBrandProps) {
  const scope = useOrgStorageScope();
  const remembered = readLastProductPaths(
    orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, scope),
  );
  const href = resolveRememberedProductHref(
    "home",
    remembered.home,
    HOME_FALLBACK,
  );

  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 overflow-visible rounded-lg select-none hover:opacity-80 transition-opacity"
      aria-label="StreamlineOS home"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <Image
          src="/logo.svg"
          alt=""
          width={32}
          height={32}
          className="object-contain"
        />
      </span>
      {showLabel ? (
        <span className="min-w-0 truncate text-sm font-semibold text-sidebar-foreground">
          StreamlineOS
        </span>
      ) : null}
    </Link>
  );
}
