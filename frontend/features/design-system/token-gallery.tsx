"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DENSITY_MODES,
  DENSITY_SPACING_ROLES,
  ELEVATIONS,
  SPACING_ROLES,
  STATUS_ROLES,
  STATUS_TONES,
  TYPE_SCALE,
  statusVar,
  typeScaleClass,
  type DensityMode,
} from "@/lib/design-tokens";

function resolved(variable: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

const noSubscription = (): (() => void) => () => undefined;

function useResolvedToken(variable: string): string {
  return useSyncExternalStore(
    noSubscription,
    () => resolved(variable),
    () => "",
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-gap-toolbar">
      <div className="flex flex-col gap-gap-inline">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="text-label text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Swatch({ tone, role }: { tone: string; role: string }) {
  const variable = `--status-${tone}-${role}`;
  const value = useResolvedToken(variable);

  const isSurface = role === "surface";
  const isRule = role === "rule";

  return (
    <div className="flex min-w-0 flex-col gap-gap-inline">
      <div
        className="h-10 rounded-md border"
        style={{
          background: isSurface ? `var(${variable})` : "var(--card)",
          borderColor: isRule ? `var(${variable})` : "var(--border)",
          color: `var(${variable})`,
        }}
      >
        {!isSurface && !isRule ? (
          <span className="flex h-full items-center justify-center text-dense font-semibold">Aa</span>
        ) : null}
      </div>
      <code className="truncate text-micro text-muted-foreground">{role}</code>
      <code className="truncate text-micro text-muted-foreground">{value || "—"}</code>
    </div>
  );
}

export function TokenGallery() {
  const [density, setDensity] = useState<DensityMode>("comfortable");

  useEffect(() => {
    const root = document.documentElement;
    if (density === "compact") root.setAttribute("data-density", "compact");
    else root.removeAttribute("data-density");
    return () => root.removeAttribute("data-density");
  }, [density]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-gap-section px-6 py-10">
      <header className="flex flex-col gap-gap-field">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Design tokens</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Every token in the layer, resolved live from globals.css in the theme you are
          viewing. Switch your OS or app theme and these values change with it — if one
          does not, that token is defined in only one branch.
        </p>
      </header>

      <Section
        title="Status"
        hint="Named by role, not hue. Both themes come from the same class, which is what a literal like bg-status-success-surface cannot do."
      >
        <div className="flex flex-col gap-gap-grid">
          {STATUS_TONES.map((tone) => (
            <div key={tone} className="flex flex-col gap-gap-field">
              <code className="text-dense font-semibold">{tone}</code>
              <div className="grid grid-cols-2 gap-gap-toolbar sm:grid-cols-4">
                {STATUS_ROLES.map((role) => (
                  <Swatch key={statusVar(tone, role)} tone={tone} role={role} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale" hint="Names the sizes previously written as arbitrary values.">
        <div className="flex flex-col gap-gap-field">
          {TYPE_SCALE.map((step) => (
            <div key={step} className="flex items-baseline gap-gap-toolbar border-b border-border/60 pb-2">
              <code className="w-24 shrink-0 text-micro text-muted-foreground">text-{step}</code>
              <span className={typeScaleClass(step)}>The quick brown fox jumps over the lazy dog</span>
            </div>
          ))}
          <div className="flex items-baseline gap-gap-toolbar pb-2">
            <code className="w-24 shrink-0 text-micro text-muted-foreground">text-sm</code>
            <span className="text-sm">Body copy stays on Tailwind&rsquo;s own scale</span>
          </div>
        </div>
      </Section>

      <Section title="Spacing" hint="The rhythm the guidelines describe in prose, as usable values.">
        <div className="flex flex-col gap-gap-field">
          {SPACING_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-gap-toolbar">
              <code className="w-32 shrink-0 text-micro text-muted-foreground">{role}</code>
              <div className="h-3 rounded-sm bg-primary/20" style={{ width: `var(--spacing-${role})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Density"
        hint="Comfortable is the default. Nothing consumes these yet — the renderer will, so a second density convention is never invented alongside this one."
      >
        <div className="flex flex-col gap-gap-toolbar">
          <div className="flex gap-gap-field">
            {DENSITY_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDensity(mode)}
                className={`rounded-md border px-3 py-1.5 text-label transition-colors ${
                  density === mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-gap-field">
            {DENSITY_SPACING_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-gap-toolbar">
                <code className="w-32 shrink-0 text-micro text-muted-foreground">{role}</code>
                <div
                  className="rounded-md border border-border bg-card"
                  style={{ height: `var(--density-${role})`, width: `var(--density-${role})` }}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Elevation" hint="Two real elevations plus a raised state, inverted for dark.">
        <div className="grid grid-cols-1 gap-gap-grid sm:grid-cols-3">
          {ELEVATIONS.map((level) => (
            <div
              key={level}
              className="rounded-xl border border-border bg-card p-card"
              style={{ boxShadow: `var(--elevation-${level})` }}
            >
              <code className="text-dense text-muted-foreground">shadow-{level}</code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
