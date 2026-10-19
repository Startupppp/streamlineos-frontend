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

/**
 * Long-form legal page in the Relay look: display title, a glass "On this
 * page" card (sticky beside the text from 901px, above it below that) and a
 * readable prose column. Typography and the token remaps that restyle the
 * pages' own markup live in relay/styles/pages/legal.css.
 */
export function LegalShell({ eyebrow, title, intro, effectiveDate, sections, children }: Props) {
  return (
    <PublicShell>
      <div className="relay-legal mx-page w-page px-page-inset">
        <header className="legal-hero">
          <PublicEyebrow>{eyebrow}</PublicEyebrow>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-intro">{intro}</p>

          <div className="legal-meta">
            <span className="legal-meta-date">
              <Calendar aria-hidden="true" className="size-3.5" />
              Effective {effectiveDate}
            </span>
            {legalNav.map((l) => (
              <Link key={l.href} href={l.href} className="legal-meta-link">
                {l.label}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            ))}
          </div>
        </header>

        <div className="legal-layout">
          <aside className="legal-toc-slot">
            <nav aria-label="On this page" className="legal-toc" data-lenis-prevent>
              <p className="legal-toc-label">On this page</p>
              <ol className="legal-toc-list">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="legal-toc-link">
                      <span className="legal-toc-index">{String(i + 1).padStart(2, "0")}</span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="legal-prose">{children}</article>
        </div>
      </div>
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
    <section id={id} className="legal-section">
      <h2 className="legal-heading">{title}</h2>
      <div className="legal-body">{children}</div>
    </section>
  );
}

export function PlainEnglish({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose legal-callout">
      <p className="legal-callout-label">Plain English</p>
      {children}
    </div>
  );
}
