import type { ReactNode } from "react";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { cn } from "@/lib/utils";

interface ReleaseSectionProps {
  id: string;
  title: string;
  description?: string;
  count: string;
  className?: string;
  children: ReactNode;
}

export function ReleaseSection({ id, title, description, count, className, children }: ReleaseSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(CONTENT_PANEL_SOLID, "flex min-w-0 flex-col overflow-hidden", className)}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-sm font-semibold text-balance text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-dense text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="font-mono text-dense tabular-nums text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}

interface ReleaseIdentityProps {
  release: ManagedProductRelease;
}

export function ReleaseIdentity({ release }: ReleaseIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-dense tabular-nums text-foreground">
        {release.version}
      </span>
      <span className="truncate text-sm font-semibold text-foreground" title={release.name}>
        {release.name}
      </span>
    </div>
  );
}
