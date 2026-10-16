import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { Button } from "@/components/ui/button";
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
      <section className="container mx-auto max-w-lg px-4 py-16 text-center lg:px-8 lg:py-24">
        <PublicEyebrow>Waitlist</PublicEyebrow>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
          Waitlist sign-up has closed
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This invitation link no longer creates a workspace. If you already have a {BRAND_NAME}{" "}
          account, sign in. Otherwise, contact us and we&rsquo;ll get you set up.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
