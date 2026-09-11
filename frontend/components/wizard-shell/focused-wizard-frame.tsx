import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { WIZARD_COL_PAD_X } from "./constants";

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
            "flex shrink-0 items-center md:hidden",
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
        </header>

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
