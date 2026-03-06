import { ReactNode } from "react";
import { BrandHeader } from "@/components/layout/brand-header";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full noir-mesh flex flex-col relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </a>
      <BrandHeader />
      <main id="main-content" aria-label="Authentication" className="flex-1 flex items-center justify-center p-4">{children}</main>
      <footer className="w-full py-4 text-center text-muted-foreground/50 text-xs">
        &copy; {currentYear} Vaivamm Capital. All rights reserved.
      </footer>
    </div>
  );
}
