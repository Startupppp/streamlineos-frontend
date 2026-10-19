import type { Metadata } from "next";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { BrandCta } from "@/features/landing/relay/components/ui/brand-cta";
import { DisplayTitle } from "@/features/landing/relay/components/ui/display-title";
import { GlassButton } from "@/features/landing/relay/components/ui/glass-button";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Waitlist sign-up has closed — ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

/**
 * Old waitlist invitation links still land here. Claiming was retired with
 * /signup (the backend answers 410 Gone), so the page says so and points to
 * the two ways forward instead of showing a form that cannot succeed.
 */
export default function ClaimPage() {
  return (
    <PublicShell>
      <div className="mx-page w-page px-page-inset">
        <section className="mx-auto flex max-w-160 flex-col items-center rounded-footer-panel border border-border-subtle bg-card-glass px-10 py-14 text-center shadow-float backdrop-blur-card w768:px-6 w768:py-10">
          <PublicEyebrow>Waitlist</PublicEyebrow>
          <DisplayTitle
            tag="h1"
            before="Waitlist sign-up has "
            accent="closed"
            after=""
            className="text-section-title leading-section-title"
            accentClassName="text-section-title-accent"
          />
          <p className="mt-4 text-body leading-body text-foreground-muted">
            This invitation link no longer creates a workspace. If you already have a {BRAND_NAME}{" "}
            account, sign in. Otherwise, contact us and we&rsquo;ll get you set up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <BrandCta label="Sign in" href="/signin" className="h-12 px-7 text-body" />
            <GlassButton href="/contact" className="h-12 px-7 text-body">
              Contact us
            </GlassButton>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
