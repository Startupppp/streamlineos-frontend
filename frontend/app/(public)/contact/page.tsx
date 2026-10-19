import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Shield, BookOpen } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { DisplayTitle } from "@/features/landing/relay/components/ui/display-title";
import { ContactForm } from "@/features/landing/contact-form";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Contact ${BRAND_NAME}`,
  description: `Reach the ${BRAND_NAME} team — sales, support, partnerships, and press.`,
  alternates: { canonical: "/contact" },
};

const channels = [
  {
    icon: Mail,
    label: "Email us directly",
    description: "A human on our team will reply within one business day.",
    value: BRAND_SUPPORT_EMAIL,
    href: `mailto:${BRAND_SUPPORT_EMAIL}`,
  },
  {
    icon: MessageSquare,
    label: "Existing customer support",
    description: "Open a ticket from inside your organization for the fastest response.",
    value: "Help · in-app",
    href: "/signin",
  },
  {
    icon: Shield,
    label: "Security disclosures",
    description: "Report a vulnerability — please don't share details on this form.",
    value: BRAND_SUPPORT_EMAIL,
    href: `mailto:${BRAND_SUPPORT_EMAIL}`,
  },
  {
    icon: BookOpen,
    label: "Read first",
    description: "Most questions about pricing, modules, and setup are answered in our docs.",
    value: "Browse the FAQ",
    href: "/#faq",
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-page flex w-page flex-col px-page-inset">
        <section className="mx-auto flex max-w-190 flex-col items-center text-center">
          <PublicEyebrow>Contact us</PublicEyebrow>
          <DisplayTitle
            tag="h1"
            before="Tell us what you're "
            accent="trying to solve"
            after="."
            className="text-hero-title leading-hero-title"
            accentClassName="text-hero-title-accent"
          />
          <p className="mt-6 max-w-150 text-lead leading-lead text-foreground-muted w390:text-body w390:leading-body">
            Pricing questions, demos, partnerships, security disclosures — every message reaches
            a human on our team. We aim to reply within one business day.
          </p>
        </section>

        <div aria-hidden="true" className="h-section-gap" />

        <section className="grid grid-cols-12 items-start gap-8 w768:grid-cols-1 w768:gap-6">
          <div className="col-span-7 w1024:col-span-7 w768:col-span-1">
            <ContactForm />
          </div>

          <aside className="col-span-5 flex flex-col gap-3 w768:col-span-1">
            {channels.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.label}
                  href={c.href}
                  className="group flex items-start gap-4 rounded-2xl border border-border-subtle bg-card-glass p-5 backdrop-blur-card transition-colors duration-(--motion-fast) ease-entrance outline-none hover:border-border-glass focus-visible:ring-2 focus-visible:ring-accent-soft"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-135 from-brand-from to-brand-to text-on-accent transition-transform duration-(--motion-fast) group-hover:scale-105">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body leading-body font-medium text-foreground">
                      {c.label}
                    </span>
                    <span className="text-relay-label leading-label text-foreground-muted">
                      {c.description}
                    </span>
                    <span className="font-mono text-relay-label leading-label break-all text-accent-soft">
                      {c.value}
                    </span>
                  </span>
                </Link>
              );
            })}
          </aside>
        </section>
      </div>
    </PublicShell>
  );
}
