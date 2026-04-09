import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthRightPanel } from "@/features/auth/auth-right-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // h-[100dvh] + overflow-hidden on root = reliable flex height for all browsers incl. iOS Safari
    <div className="flex h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      {/* Form column — full width on mobile, half on lg+ */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        {/* Logo */}
        <header className="shrink-0 flex items-center justify-center px-4 sm:px-8 py-4 sm:py-5 border-b border-border/30">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.svg" alt="Vaivamm" width={22} height={22} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-foreground group-hover:text-gold transition-colors">
                Vaivamm
              </span>
              <span className="text-xs text-muted-foreground ml-1">CRM</span>
            </div>
          </Link>
        </header>

        {/* Centered form area — flex-1 fills space, items/justify center the child */}
        <main
          id="main-content"
          aria-label="Authentication"
          className="flex flex-1 flex-col items-center *:text-center justify-center pb-12 px-4 sm:px-8 h-full"
        >
          {children}
        </main>

        {/* Footer */}
        <footer className="shrink-0 px-4 sm:px-8 py-4 border-t border-border/20">
          <p className="text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Decorative right panel — hidden on mobile */}
      <div className="hidden lg:flex flex-1 shrink-0">
        <AuthRightPanel />
      </div>
    </div>
  );
}
