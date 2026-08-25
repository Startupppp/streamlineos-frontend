import type { Metadata } from "next";
import { Layers, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { WaitlistForm } from "@/features/landing/waitlist-form";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/branding";

const TITLE = `Join the ${BRAND_NAME} waitlist`;
const DESCRIPTION = `${BRAND_NAME} is opening to new teams in small batches. Tell us about your organization and we'll email you when your invite is ready.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/waitlist" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const assurances = [
  {
    icon: Sparkles,
    label: "Batched invites",
    description:
      "We onboard a handful of teams at a time so every one of them gets set up properly.",
  },
  {
    icon: Layers,
    label: "The whole platform",
    description:
      "HR, payroll, projects, CRM, chat and accounting — your invite opens all of it, not a trial slice.",
  },
  {
    icon: ShieldCheck,
    label: "Your details stay yours",
    description:
      "We use what you share here to prioritise your invite. No card, no reselling, no marketing lists.",
  },
  {
    icon: Mail,
    label: "Questions first?",
    description: `Write to ${BRAND_SUPPORT_EMAIL} and a human on our team will answer.`,
  },
];

export default function WaitlistPage() {
  return (
    <PublicShell>
      <section className="container mx-auto px-4 lg:px-8 max-w-3xl text-center">
        <PublicEyebrow>Early access</PublicEyebrow>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02] text-foreground mb-5">
          Join the{" "}
          <span className="text-status-info-ink">{BRAND_NAME} waitlist.</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
          We&apos;re opening to new teams in small batches so each one gets a proper setup.
          Tell us a little about your organization and we&apos;ll email you the moment your
          invite is ready.
        </p>
      </section>

      <section className="container mx-auto px-4 lg:px-8 max-w-6xl mt-12 lg:mt-16 grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <WaitlistForm />
        </div>

        <aside className="lg:col-span-5 space-y-3">
          {assurances.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-white/70 backdrop-blur-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-gradient-info-from to-gradient-info-to inline-flex items-center justify-center shrink-0 shadow-[0_6px_18px_-6px_rgba(59,130,246,0.5)]">
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-foreground mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-label text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>
      </section>
    </PublicShell>
  );
}
