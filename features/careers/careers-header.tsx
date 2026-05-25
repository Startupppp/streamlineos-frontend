import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type CareersHeaderProps = {
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function CareersHeader({
  backHref = "/",
  backLabel = "Back to site",
  className,
}: CareersHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/careers" className="flex items-center gap-3 min-w-0 group">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-primary/10 ring-1 ring-primary/25 shrink-0 transition-shadow group-hover:shadow-gold">
            <Image
              src="/logo.svg"
              alt="Vaivamm Capital"
              fill
              className="object-contain p-1.5"
              priority
            />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="gold-text text-lg font-bold tracking-tight block">
              Vaivamm Capital
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
              Advisors LLP
            </span>
          </div>
        </Link>

        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
