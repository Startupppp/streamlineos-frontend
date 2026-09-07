import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Shield, BookOpen } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
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
    value: "Help Â· in-app",
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
      <section className="container mx-auto px-4 lg:px-8 max-w-3xl text-center">
        <PublicEyebrow>Contact us</PublicEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-foreground mb-5">
          Tell us what you&apos;re{" "}
          <span className="text-status-info-ink">trying to solve.</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
          Pricing questions, demos, partnerships, security disclosures — every message reaches
          a human on our team. We aim to reply within one business day.
        </p>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-6xl mt-12 lg:mt-16 grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>

        <aside className="lg:col-span-5 space-y-3">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                className="group block rounded-2xl border border-border bg-white/70 backdrop-blur-sm p-5 hover:border-status-info-rule hover:bg-white transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-gradient-info-from to-gradient-info-to inline-flex items-center justify-center shrink-0 shadow-[0_6px_18px_-6px_rgba(59,130,246,0.5)] group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-foreground mb-0.5">
                      {c.label}
                    </p>
                    <p className="text-label text-muted-foreground leading-relaxed mb-1.5">
                      {c.description}
                    </p>
                    <p className="text-xs font-mono text-status-info-ink break-all">{c.value}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </aside>
      </section>
    </PublicShell>
  );
}
