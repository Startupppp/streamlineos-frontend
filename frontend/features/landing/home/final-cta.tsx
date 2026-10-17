import { PRICING } from "@/lib/pricing";
import { SignInAction } from "./hero";
import { Section } from "./section";

export function FinalCTA() {
  return (
    <Section className="pt-8 sm:pt-12">
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-16 text-center sm:py-24">
        <h2 className="mx-auto max-w-[18ch] text-balance text-[clamp(2.1rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground">
          Run the whole company from one place
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
          Free for up to {PRICING.freeSeatLimit} seats. Turn on the modules you need and add the
          rest later.
        </p>
        <SignInAction className="mt-9" />
      </div>
    </Section>
  );
}
