import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/pricing";
import { BRAND_NAME } from "@/lib/branding";
import { Frame } from "./frame";
import { HeroScreen } from "./hero-screen";
import { LogoStrip } from "./proof";
import { CONTAINER } from "./section";

export function SignInAction({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Button asChild size="lg" className="h-12 w-full rounded-xl px-8 text-[0.95rem] sm:w-auto">
        <Link href="/signin">Sign in</Link>
      </Button>
    </div>
  );
}

export function Hero() {
  return (
    <section className="overflow-x-clip pt-14 sm:pt-20">
      <div className={`${CONTAINER} text-center`}>
        <p className="lp-rise inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-label font-medium text-foreground">
          <span className="size-1.5 rounded-full bg-brand-deep" aria-hidden />
          All-in-one business OS
        </p>

        <h1 className="lp-rise mx-auto mt-7 max-w-[20ch] text-balance text-[clamp(2.6rem,7.2vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-foreground [animation-delay:60ms]">
          Run HR, sales, delivery, and finance in one place
        </h1>

        <p className="lp-rise mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground [animation-delay:120ms]">
          {BRAND_NAME} replaces separate HR, CRM, project, billing and helpdesk tools with one
          workspace that shares the same customers, projects and people.
        </p>

        <SignInAction className="lp-rise mt-9 [animation-delay:180ms]" />

        <p className="lp-rise mt-5 text-sm text-muted-foreground [animation-delay:240ms]">
          Free for up to {PRICING.freeSeatLimit} seats. No card required.
        </p>
      </div>

      {/* Wider than the text column on purpose: the product is the hero. */}
      <div className="lp-rise mx-auto mt-12 max-w-[1320px] px-3 [animation-delay:300ms] sm:mt-16 sm:px-6">
        <div className="lp-drift lp-crop max-h-[420px] sm:max-h-[600px]">
          <Frame
            crumb="Today"
            label={`Mockup of a ${BRAND_NAME} workspace: sales pipeline, projects, attendance and payroll, receivables, support tickets and timesheets on one screen, with the same customer highlighted in each.`}
          >
            <HeroScreen />
          </Frame>
        </div>
      </div>

      <div className={`${CONTAINER} mt-10 sm:mt-14`}>
        <LogoStrip caption="Customer logos appear here once approved" />
      </div>
    </section>
  );
}
