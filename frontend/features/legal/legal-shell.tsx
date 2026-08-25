import { ReactNode } from "react";
import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";

export type LegalSection = {
  id: string;
  title: string;
};

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
  children: ReactNode;
};

const legalNav = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms of service" },
  { href: "/legal/security", label: "Security" },
];

export function LegalShell({ eyebrow, title, intro, effectiveDate, sections, children }: Props) {
  return (
    <PublicShell>
      <section className="container mx-auto px-4 lg:px-8 max-w-5xl">
        <PublicEyebrow>{eyebrow}</PublicEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.05] text-muted-foreground mb-5">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">{intro}</p>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-status-info-ink" />
            Effective {effectiveDate}
          </span>
          <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300" />
          {legalNav.map((l, i) => (
            <span key={l.href} className="inline-flex items-center gap-3">
              {i > 0 && <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300" />}
              <Link
                href={l.href}
                className="hover:text-status-info-ink transition-colors inline-flex items-center gap-1"
              >
                {l.label}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </span>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-7xl mt-12 lg:mt-16 grid lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-3 order-2 lg:order-1">
          <div className="lg:sticky lg:top-28 rounded-2xl border border-border bg-white/70 backdrop-blur-sm p-5">
            <p className="text-dense font-medium text-muted-foreground mb-3">
              On this page
            </p>
            <ol className="space-y-1.5">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group flex items-start gap-3 text-label text-muted-foreground hover:text-status-info-ink transition-colors py-1"
                  >
                    <span className="text-micro font-mono tabular-nums text-muted-foreground group-hover:text-status-info-ink mt-1 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="lg:col-span-9 order-1 lg:order-2 legal-prose">
          {children}
        </article>
      </section>
    </PublicShell>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 mb-12">
      <h2 className="font-display text-2xl lg:text-[1.75rem] font-extrabold tracking-[-0.02em] text-muted-foreground mb-4 leading-tight">
        {title}
      </h2>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export function PlainEnglish({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose rounded-xl border border-status-info-rule bg-status-info-surface px-4 py-3.5 my-5 text-sm text-muted-foreground leading-relaxed">
      <p className="text-dense font-semibold text-status-info-ink mb-1.5">
        Plain English
      </p>
      {children}
    </div>
  );
}
