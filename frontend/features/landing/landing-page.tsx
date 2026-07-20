import { LandingNav } from "./components/landing-nav";
import { LandingHero } from "./components/landing-hero";
import { LandingApps } from "./components/landing-apps";
import { LandingWalkthrough } from "./components/landing-walkthrough";
import { LandingStats } from "./components/landing-stats";
import { LandingPillars } from "./components/landing-pillars";
import { LandingTestimonials } from "./components/landing-testimonials";
import { LandingPricing } from "./components/landing-pricing";
import { LandingFAQ } from "./components/landing-faq";
import { LandingCTA } from "./components/landing-cta";
import { LandingFooter } from "./landing-footer";
import { LandingPageMotion } from "./landing-page-motion";

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip surface-soft text-slate-900 selection:bg-brand-core/20 selection:text-slate-950">
      <LandingNav />
      <LandingPageMotion>
        <main className="relative flex-1 min-w-0 overflow-x-clip">
          <LandingHero />
          <LandingApps />
          <LandingWalkthrough />
          <LandingStats />
          <LandingPillars />
          <LandingTestimonials />
          <LandingPricing />
          <LandingFAQ />
          <LandingCTA />
        </main>
      </LandingPageMotion>
      <LandingFooter />
    </div>
  );
}
