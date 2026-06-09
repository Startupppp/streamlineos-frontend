import { ReactNode } from "react";
import Link from "next/link";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { AuthRightPanel } from "@/features/auth/auth-right-panel";
import { BRAND_NAME } from "@/lib/branding";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] overflow-hidden surface-soft text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="relative flex flex-1 flex-col overflow-y-auto scrollbar-hide">
        <header className="shrink-0 flex items-center justify-between px-6 sm:px-10 py-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label={BRAND_NAME}
          >
            <AnimatedLogo size={34} className="rounded-xl" />
            <span className="font-display text-base font-bold tracking-tight text-slate-900">
              {BRAND_NAME}
            </span>
          </Link>
          <Link
            href="/"
            className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Back to site
          </Link>
        </header>

        <main
          id="main-content"
          aria-label="Authentication"
          className="flex flex-1 flex-col items-center justify-center py-8 px-4 sm:px-8"
        >
          {children}
        </main>

        <footer className="shrink-0 px-6 sm:px-10 py-5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} {BRAND_NAME}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/legal/privacy"
              className="hover:text-slate-700 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-slate-700 transition-colors"
            >
              Terms
            </Link>
          </div>
        </footer>
      </div>

      <div className="hidden lg:flex flex-1 shrink-0 border-l border-slate-200/60">
        <AuthRightPanel />
      </div>
    </div>
  );
}
