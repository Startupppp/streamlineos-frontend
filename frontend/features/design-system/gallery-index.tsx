import Link from "next/link";

interface GalleryEntry {
  readonly slug: string;
  readonly title: string;
  readonly spec: string;
}

const GALLERIES: readonly GalleryEntry[] = [
  { slug: "build-list", title: "Build list", spec: "build-list-responsive.spec.ts" },
  { slug: "content-intake", title: "Content & intake", spec: "content-intake-a11y.spec.ts" },
  { slug: "execution-core", title: "Execution core", spec: "execution-core-a11y.spec.ts" },
  { slug: "governance-qa", title: "Governance & QA", spec: "governance-qa-a11y.spec.ts" },
  { slug: "managed-products", title: "Managed products", spec: "managed-products-a11y.spec.ts" },
  { slug: "org-work", title: "Org work surfaces", spec: "org-work-a11y.spec.ts" },
  { slug: "planning-surfaces", title: "Planning surfaces", spec: "planning-surfaces-a11y.spec.ts" },
  { slug: "portals", title: "Portals", spec: "portals-a11y.spec.ts" },
  { slug: "settings", title: "Settings surfaces", spec: "settings-a11y.spec.ts" },
  { slug: "teams-team", title: "Team home", spec: "teams-team-a11y.spec.ts" },
];

export function GalleryIndex() {
  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-base font-semibold tracking-tight">Acceptance galleries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dev-only surfaces that mount the real components with static stub data, so the Playwright
          accessibility and responsive specs measure what ships. Each is driven by the spec named
          beside it.
        </p>
      </header>
      <ul role="list" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERIES.map((gallery) => (
          <li key={gallery.slug} role="listitem">
            <Link
              href={`/design-system/${gallery.slug}`}
              className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-muted-foreground/40"
            >
              <span className="text-sm font-medium">{gallery.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{gallery.spec}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
