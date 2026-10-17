import type { Metadata } from "next";
import { MarketingShell } from "@/features/landing/home/marketing-shell";
import { WaitlistForm } from "@/features/landing/waitlist/waitlist-form";

export const metadata: Metadata = {
  title: { absolute: "Join the waitlist | StreamlineOS" },
  description: "Tell us about your team and we'll email you when a StreamlineOS spot opens.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-xl px-5 pb-24 pt-32 sm:px-8">
        <h1 className="lp-display text-5xl text-foreground sm:text-6xl">Join the waitlist</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          StreamlineOS is opening in small batches. Share a few details and we'll email you when your spot opens.
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>
    </MarketingShell>
  );
}
