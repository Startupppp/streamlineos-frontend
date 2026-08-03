import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

interface PortalHeaderProps {
  showProjectsLink?: boolean;
}

export function PortalHeader({ showProjectsLink = false }: PortalHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={showProjectsLink ? "/portal/projects" : "#"}
          aria-label={`${BRAND_NAME} Client Portal`}
          className="flex items-center gap-2.5 group"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden">
            <Image
              src="/logo.svg"
              alt={BRAND_NAME}
              width={32}
              height={32}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
              {BRAND_NAME}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground leading-none mt-0.5">
              Client Portal
            </span>
          </div>
        </Link>
      </div>

      <a
        href={`mailto:${BRAND_SUPPORT_EMAIL}`}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Need help?
      </a>
    </header>
  );
}
