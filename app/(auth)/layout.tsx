import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthRightPanel } from "./_components/auth-right-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen h-screen w-full flex overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="flex-1 lg:w-1/2 flex flex-col min-w-0 bg-background overflow-hidden">
        <div className="px-6 py-5 flex items-center shrink-0">
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
          className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-4"
        >
          {children}
        </main>

        <footer className="px-6 py-4 shrink-0">
          <p className="text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
          </p>
        </footer>
      </div>

      <div className="hidden lg:flex lg:w-1/2 shrink-0 h-full">
        <AuthRightPanel />
      </div>
    </div>
  );
}
