import "./home/home.css";
import { Navbar } from "./home/navbar";
import { Hero } from "./home/hero";
import { Problem } from "./home/problem";
import { ModuleStage } from "./home/module-stage";
import { FeatureRows } from "./home/feature-rows";
import { Connected } from "./home/connected";
import { Pricing } from "./home/pricing";
import { FAQ } from "./home/faq";
import { FinalCTA } from "./home/final-cta";
import { LandingFooter } from "./landing-footer";

export function LandingPage() {
  return (
    <div className="lp relative flex min-h-dvh flex-col text-foreground selection:bg-brand-core/20">
      <Navbar />
      <main className="min-w-0 flex-1">
        <Hero />
        <Problem />
        <ModuleStage />
        <FeatureRows />
        <Connected />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
