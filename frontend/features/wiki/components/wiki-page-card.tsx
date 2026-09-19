"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import { KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { coverSurfaceStyle } from "@/features/wiki/components/page-cover";
import { cn } from "@/lib/utils";

export const WIKI_PAGE_CARD_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

interface WikiPageCardProps {
  href?: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
  subtitle: string;
  children?: ReactNode;
}

export function WikiPageCard({
  href,
  title,
  icon,
  coverImage,
  subtitle,
  children,
}: WikiPageCardProps) {
  const cover = coverImage ? (
    <div
      className="h-16 w-full"
      style={coverSurfaceStyle(coverImage)}
      aria-hidden
    />
  ) : null;

  const identity = (
    <>
      <span className="shrink-0 text-xl">
        {icon ?? (
          <KbFileTextIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={title || "Untitled"}
          className="text-sm font-medium"
        />
        {subtitle ? (
          <p
            className="mt-0.5 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-panel",
        href && "transition-colors hover:bg-muted/50",
      )}
    >
      {href ? (
        <Link href={href} className="block">
          {cover}
        </Link>
      ) : (
        cover
      )}
      <div className="flex items-start gap-3 p-3">
        {href ? (
          <Link href={href} className="flex min-w-0 flex-1 items-start gap-3">
            {identity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3">{identity}</div>
        )}
        {children}
      </div>
    </div>
  );
}
