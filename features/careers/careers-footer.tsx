import Image from "next/image";
import Link from "next/link";

export function CareersFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/50 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-primary/10 ring-1 ring-primary/20">
              <Image
                src="/logo.svg"
                alt="Vaivamm"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <p className="text-sm font-semibold gold-text">Vaivamm Capital</p>
              <p className="text-xs text-muted-foreground">
                Building the future of capital markets
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/careers" className="hover:text-foreground transition-colors">
              Careers
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; 2025 Vaivamm Capital. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
