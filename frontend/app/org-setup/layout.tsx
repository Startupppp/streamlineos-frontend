import { ReactNode } from "react";
import Link from "next/link";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { ORG_SETUP_COL_PAD_X } from "@/features/org-setup/lib/constants";
import { cn } from "@/lib/utils";

export default function OrgSetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] max-w-[100vw] overflow-hidden surface-soft text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "flex shrink-0 items-center py-3 md:hidden",
            ORG_SETUP_COL_PAD_X,
          )}
        >
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 group"
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
          aria-label="Organization setup"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
