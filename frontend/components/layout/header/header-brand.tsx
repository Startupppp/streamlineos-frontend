"use client";

import Link from "next/link";
import Image from "next/image";
import { resolveRememberedProductHref } from "../last-product-path";
import { useLastProductPaths } from "../use-last-product-paths";

const HOME_FALLBACK = "/dashboard";

interface HeaderBrandProps {
  showLabel?: boolean;
}

export function HeaderBrand({ showLabel = true }: HeaderBrandProps) {
  const remembered = useLastProductPaths();
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
