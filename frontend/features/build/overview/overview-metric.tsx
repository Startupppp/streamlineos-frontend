import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function OverviewSectionLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

export function OverviewFact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-4 border-b border-border/80 py-2 last:border-b-0",
        className,
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-sm tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

export function OverviewRecordLink({
  href,
  title,
  trailing,
}: {
  href: string;
  title: string;
  trailing: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-border/80 py-2 text-sm last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate">{title}</span>
      <span className="flex shrink-0 items-center gap-2">{trailing}</span>
    </Link>
  );
}
