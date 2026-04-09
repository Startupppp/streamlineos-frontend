import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthRightPanel } from "@/features/auth/auth-right-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      {/* Form side — full width on mobile, half on lg+ */}
      <div className="flex-1 lg:w-1/2 flex flex-col min-w-0 bg-background min-h-[100dvh]">
        {/* Logo header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center shrink-0">
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
        </div>

        <main
          id="main-content"
          aria-label="Authentication"
          className="flex-1 w-full flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8"
        >
          {children}
        </main>

        <footer className="px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <p className="text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Decorative right panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 shrink-0 min-h-[100dvh]">
        <AuthRightPanel />
      </div>
    </div>
  );
}
