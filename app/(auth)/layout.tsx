import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full noir-mesh flex flex-col relative">
      <header className="w-full glass border-b border-gold/10 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Vaivamm Logo" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-foreground">Vaivamm CRM</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">{children}</main>
      <footer className="w-full py-4 text-center text-muted-foreground/50 text-xs">
        &copy; {currentYear} Vaivamm Capital. All rights reserved.
      </footer>
    </div>
  );
}
