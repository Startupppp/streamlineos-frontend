import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Shield, BookOpen } from "lucide-react";
import { ContactForm } from "@/features/landing/contact-form";
import { MarketingShell } from "@/features/landing/home/marketing-shell";
import { PageHero } from "@/features/landing/home/page-hero";
import { Section } from "@/features/landing/home/section";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Contact ${BRAND_NAME}`,
  description: `Reach the ${BRAND_NAME} team for sales, support, partnerships and press.`,
  alternates: { canonical: "/contact" },
};

const channels = [
  {
    icon: Mail,
    label: "Email us directly",
    description: "A person on our team replies within one business day.",
    value: BRAND_SUPPORT_EMAIL,
    href: `mailto:${BRAND_SUPPORT_EMAIL}`,
  },
  {
    icon: MessageSquare,
    label: "Existing customer support",
    description: "Open a ticket from inside your organisation for the fastest reply.",
    value: "Help, in the app",
    href: process.env.NEXT_PUBLIC_WAITLIST_MODE === "true" ? "/waitlist" : "/signin",
  },
  {
    icon: Shield,
    label: "Security disclosures",
    description: "Report a vulnerability by email. Please don't share details on this form.",
    value: BRAND_SUPPORT_EMAIL,
    href: `mailto:${BRAND_SUPPORT_EMAIL}`,
  },
  {
    icon: BookOpen,
    label: "Read first",
    description: "Most questions about pricing, modules and setup are answered in the FAQ.",
    value: "Browse the FAQ",
    href: "/#faq",
  },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Tell us what you’re trying to solve"
        lede="Pricing, demos, partnerships or security. Every message reaches a person on our team, and we aim to reply within one business day."
      />

      <Section className="pt-0 sm:pt-0">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ContactForm />
          </div>

          <ul className="space-y-3 lg:col-span-5">
            {channels.map((channel) => (
              <li key={channel.label}>
                <Link
                  href={channel.href}
                  className="lp-card group flex items-start gap-4 rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--lp-accent-soft) text-(--lp-accent)">
                    <channel.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{channel.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                      {channel.description}
                    </span>
                    <span className="mt-1.5 block break-all text-sm font-medium text-(--lp-accent)">
                      {channel.value}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </MarketingShell>
  );
}
