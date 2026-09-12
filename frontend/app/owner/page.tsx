import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { requireSession } from "@/lib/rbac/require-permission";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Platform operations",
  robots: { index: false, follow: false },
};

const PLATFORM_SURFACES = [
  {
    href: "/blog/admin",
    title: "Blog administration",
    description:
      "Posts and categories for the marketing site. One global row set for the whole platform, held only by operators.",
    keys: "blog:posts:manage · blog:categories:manage · blog:ai:use",
  },
] as const;

const UNBUILT_SURFACES = [
  {
    title: "Platform promotions",
    description:
      "Promotion codes issued by the vendor rather than by a tenant. The permission keys exist and resolve; no screen is built yet.",
    keys: "billing:promotions:view · billing:promotions:manage",
  },
] as const;

export default async function OwnerPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Platform operations
        </h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as a platform operator
          {session.user.email ? ` (${session.user.email})` : ""}. This standing
          comes from the deployment&apos;s operator allowlist, not from
          membership of any organization, so it is not affected by tenant roles.
        </p>
      </div>

      <div className={cn(CONTENT_PANEL_SOLID, "divide-y divide-border/70")}>
        {PLATFORM_SURFACES.map((surface) => (
          <div
            key={surface.href}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {surface.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {surface.description}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {surface.keys}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={surface.href}>Open</Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Held but not yet surfaced
        </h2>
        <div className={cn(CONTENT_PANEL_SOLID, "divide-y divide-border/70")}>
          {UNBUILT_SURFACES.map((surface) => (
            <div key={surface.title} className="space-y-1 p-4">
              <p className="text-sm font-semibold text-foreground">
                {surface.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {surface.description}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {surface.keys}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Operating a customer workspace is separate from this route. To work
        inside an organization, join or create one and use its own navigation.
      </p>
    </div>
  );
}
