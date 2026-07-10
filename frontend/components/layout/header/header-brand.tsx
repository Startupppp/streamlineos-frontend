"use client"

import Link from "next/link"
import Image from "next/image"

interface HeaderBrandProps {
  showLabel?: boolean
}

export function HeaderBrand({ showLabel = true }: HeaderBrandProps) {
  return (
    <div className="flex shrink-0 items-center overflow-visible gap-2">
      <Link
        href="/dashboard"
        className="rounded-lg overflow-hidden shrink-0 hover:opacity-80 transition-opacity flex items-center justify-center h-8 w-8"
        aria-label="StreamlineOS home"
      >
        <Image
          src="/logo.svg"
          alt=""
          width={32}
          height={32}
          className="object-contain"
        />
      </Link>
      {showLabel && (
        <span className="text-sm font-semibold text-sidebar-foreground truncate min-w-0">
          StreamlineOS
        </span>
      )}
    </div>
  )
}
