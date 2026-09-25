"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import type { BuildScopeFallback } from "@/lib/build/build-scope-fallback";

interface BuildScopeRecoveryProps {
  fallback: BuildScopeFallback;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function BuildScopeRecovery({
  fallback,
  isCollapsed,
  onNavigate,
}: BuildScopeRecoveryProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const href = fallback.kind === "recover" ? fallback.href : null;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (href === null) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (event.button !== 0) return;
      event.preventDefault();
      requestLeave(() => {
        onNavigate?.();
        router.push(href);
      });
    },
    [href, requestLeave, onNavigate, router],
  );

  if (fallback.kind !== "recover") return null;

  if (isCollapsed)
    return (
      <Link
        href={fallback.href}
        onClick={handleClick}
        aria-label={`This Build scope is no longer available. ${fallback.label}`}
        title={fallback.label}
        className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-status-warning-ink hover:bg-sidebar-accent"
      >
        <TriangleAlert className="h-4 w-4" />
      </Link>
    );

  return (
    <div
      className={cn(
        "mt-1 flex flex-col gap-1.5 rounded-md border border-status-warning-rule",
        "bg-status-warning-surface px-2.5 py-2",
      )}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning-ink" />
        <p className="text-micro leading-relaxed text-status-warning-ink-strong">
          This Build scope is no longer available to you.
        </p>
      </div>
      <Link
        href={fallback.href}
        onClick={handleClick}
        className="text-micro font-medium text-status-warning-ink-strong underline underline-offset-2 hover:no-underline"
      >
        {fallback.label}
      </Link>
    </div>
  );
}
