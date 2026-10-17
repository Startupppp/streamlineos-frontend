import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { MarketingShell } from "./home/marketing-shell";
import { Hero } from "./home/hero";
import { ProductReveal } from "./home/product-reveal";
import { ModuleMarquee } from "./home/module-marquee";
import { Replaces } from "./home/replaces";
import { ModuleStage } from "./home/module-stage";
import { FeatureRows } from "./home/feature-rows";
import { Steps } from "./home/steps";
import { Together } from "./home/together";
import { Pricing } from "./home/pricing";
import { FAQ } from "./home/faq";
import { Section, SectionHeading } from "./home/section";
import { WaitlistForm } from "./waitlist/waitlist-form";
import { FinalCTA } from "./home/final-cta";

export function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <ProductReveal />
      <ModuleMarquee />
      <Replaces />
      <ModuleStage />
      <FeatureRows />
      <Steps />
      <Together />
      <Pricing />
      <Section id="waitlist">
        <SectionHeading
          title="Join the waitlist"
          lede="Tell us about your team. We'll email you when a spot opens."
          className="mb-10"
        />
        <div className="mx-auto max-w-xl">
          <WaitlistForm />
        </div>
      </Section>
      <FAQ>
        <div className="lp-card mt-8 rounded-3xl p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-(--lp-accent-soft) text-(--lp-accent)">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">Still have a question?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A person on our team replies within one business day.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            Talk to us
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </FAQ>
      <FinalCTA />
    </MarketingShell>
  );
}
