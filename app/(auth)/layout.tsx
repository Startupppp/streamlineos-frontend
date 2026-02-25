import { ReactNode } from "react";
import { BrandHeader } from "@/components/layout/brand-header";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full noir-mesh flex flex-col relative">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center p-4">{children}</main>
      <footer className="w-full py-4 text-center text-muted-foreground/50 text-xs">
        &copy; {currentYear} Vaivamm Capital. All rights reserved.
      </footer>
    </div>
  );
}
