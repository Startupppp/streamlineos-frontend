import { Globe2, ShieldCheck } from "lucide-react";
import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { DataResidency } from "@/lib/pricing-live";

/**
 * Where a customer's data will rest, said before they ask.
 *
 * Phase 3, ticket 12. The marketing site described the product at length and
 * never once said which country the data sits in — which is the first question
 * from any European buyer and the second from any regulated one. Not answering
 * it does not avoid the question; it just moves the answer to a sales call, or
 * loses the deal quietly.
 *
 * Read from `/public/data-residency` rather than written here, for the same
 * reason the prices are: a page with its own copy of the region list eventually
 * describes a region that was renamed or one that never shipped.
 */
export function DataResidencySection({ residency }: { residency: DataResidency | null }) {
  // Nothing invented in its place. A hardcoded fallback would be a claim about
  // where data rests made by a page that could not reach the system that knows.
  if (!residency || residency.options.length === 0) return null;

  return (
    <section aria-label="Data residency" className="flex flex-col gap-12 w1024:gap-10 w390:gap-8">
      <SectionHead
        badge="data residency"
        title={{ before: "Your data stays where ", accent: "you", after: " need it." }}
        aside="Choose a region when you sign up. It is set once, at the start, and every record your workspace holds rests there."
      />

      <div className="grid grid-cols-3 gap-3 w768:grid-cols-2 w390:grid-cols-1">
        {residency.options.map((option) => (
          <div
            key={option.region}
            className="rounded-pricing-card border border-pricing-card-border bg-pricing-card p-6 backdrop-blur-card w390:p-4.75"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-glass text-accent-soft">
              <Globe2 className="size-4" aria-hidden />
            </span>
            <h3 className="mt-4 text-lead leading-lead font-medium text-foreground">
              {option.description}
            </h3>
            {option.examples?.length ? (
              <p className="mt-1 text-body leading-body text-foreground-muted">
                {/* The countries, because that is what a reader scans for --
                    "is my country on this list" is the actual question. */}
                {option.examples.join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {residency.likely?.isMapped ? (
        <p className="flex items-start justify-center gap-2 text-center text-body leading-body text-foreground-muted">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-accent-soft" aria-hidden />
          <span>
            Based on where you are, a new workspace would be created in{" "}
            <strong className="font-semibold text-foreground">
              {residency.likely.description}
            </strong>
            . You can choose a different region at signup.
          </span>
        </p>
      ) : null}
    </section>
  );
}
