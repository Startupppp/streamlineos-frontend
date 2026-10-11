import type { ReactNode } from "react";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { cn } from "@/lib/utils";

interface ReleaseSectionProps {
  id: string;
  title: string;
  count: string;
  className?: string;
  children: ReactNode;
}

export function ReleaseSection({ id, title, count, className, children }: ReleaseSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(CONTENT_PANEL_SOLID, "flex min-w-0 flex-col overflow-hidden", className)}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
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
      <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-foreground">
        {release.version}
      </span>
      <span className="truncate text-sm font-medium text-foreground" title={release.name}>
        {release.name}
      </span>
    </div>
  );
}
