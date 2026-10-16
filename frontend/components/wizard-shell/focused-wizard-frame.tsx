"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { WIZARD_COL_PAD_X } from "./constants";
import { useSignOut } from "@/hooks/common/auth-hooks";

type FocusedWizardFrameProps = {
  children: ReactNode;
  mainLabel: string;
  mobileHeaderClassName?: string;
};

export function FocusedWizardFrame({
  children,
  mainLabel,
  mobileHeaderClassName,
}: FocusedWizardFrameProps) {
  const signOut = useSignOut();

  function handleSignOut() {
    signOut.mutate();
  }

  return (
    <div className="relative flex h-[100dvh] max-w-[100vw] overflow-hidden surface-soft text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-status-neutral-fill focus:px-4 focus:py-2 focus:text-white text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "flex shrink-0 items-center justify-between md:hidden",
            WIZARD_COL_PAD_X,
            mobileHeaderClassName ?? "py-3",
          )}
        >
          <Link
            href="/"
            className="group flex min-h-11 items-center gap-2.5"
            aria-label={BRAND_NAME}
          >
            <AnimatedLogo size={30} className="rounded-xl" />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {BRAND_NAME}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Sign out
          </button>
        </header>

        <div
          className={cn(
            "absolute right-0 top-0 z-30 hidden md:flex",
            WIZARD_COL_PAD_X,
            "py-4",
          )}
        >
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Sign out
          </button>
        </div>

        <main
          id="main-content"
          aria-label={mainLabel}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
