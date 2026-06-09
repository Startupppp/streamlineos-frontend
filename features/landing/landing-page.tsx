import { LandingNav } from "./components/landing-nav";
import { LandingHero } from "./components/landing-hero";
import { LandingWalkthrough } from "./components/landing-walkthrough";
import { LandingStats } from "./components/landing-stats";
import { LandingModules } from "./components/landing-modules";
import { LandingPillars } from "./components/landing-pillars";
import { LandingTestimonials } from "./components/landing-testimonials";
import { LandingPricing } from "./components/landing-pricing";
import { LandingFAQ } from "./components/landing-faq";
import { LandingCTA } from "./components/landing-cta";
import { LandingFooter } from "./landing-footer";

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col surface-soft text-slate-900 selection:bg-blue-500/20 selection:text-blue-950 overflow-x-clip">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingWalkthrough />
        <LandingStats />
        <LandingModules />
        <LandingPillars />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
