import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full auth-bg flex flex-col relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #bd882c 1px, transparent 1px),
            linear-gradient(to bottom, #bd882c 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      {/* Minimal header */}
      <header className="w-full px-6 py-4 flex items-center relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center overflow-hidden">
            <Image src="/logo.svg" alt="Vaivamm" width={20} height={20} />
          </div>
          <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
            Vaivamm CRM
          </span>
        </Link>
      </header>

      {/* Auth content */}
      <main
        id="main-content"
        aria-label="Authentication"
        className="flex-1 flex items-center justify-center p-4 relative z-10"
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
