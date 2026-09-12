import { Globe2, ShieldCheck } from "lucide-react";
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
    <section className="mt-20 lg:mt-24 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8 max-w-4xl py-16 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Your data stays where you need it
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Choose a region when you sign up. It is set once, at the start, and every
            record your workspace holds rests there.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {residency.options.map((option) => (
            <div
              key={option.region}
              className="rounded-xl border border-border bg-white p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info-surface text-status-info-ink">
                <Globe2 className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {option.description}
              </h3>
              {option.examples?.length ? (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {/* The countries, because that is what a reader scans for --
                      "is my country on this list" is the actual question. */}
                  {option.examples.join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {residency.likely?.isMapped ? (
          <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-status-info-ink" aria-hidden />
            <span>
              Based on where you are, a new workspace would be created in{" "}
              <strong className="font-semibold text-foreground">
                {residency.likely.description}
              </strong>
              . You can choose a different region at signup.
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
