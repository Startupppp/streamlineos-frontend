import { Check, X } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";
import { PRICING } from "@/lib/pricing";
import { MotionItem, MotionStagger } from "../components/motion/motion-reveal";
import { VIEWPORT_EARLY } from "./motion";
import { Section, SectionHeading, StartLink } from "./section";

/** Each line on the left is fixed by the line beside it on the right. */
const WITHOUT = [
  "Five logins to remember",
  "The same customer typed into every app",
  "Five bills every month",
  "Chasing other teams for updates",
];

const WITH = [
  "One login for every team",
  "Type a customer once, every team sees it",
  `One bill, and free for up to ${PRICING.freeSeatLimit} people`,
  "Everyone sees the same live details",
];

/** Without and with, as two matching cards (after a Dribbble comparison pattern). */
export function Replaces() {
  return (
    <Section>
      <SectionHeading
        title="Five tools, five logins, five bills. Or one."
        lede={`${BRAND_NAME} replaces the separate apps your teams use for HR, sales, projects, billing and support, with one workspace where everyone shares the same data.`}
      />

      <MotionStagger viewport={VIEWPORT_EARLY} className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-2 md:gap-6">
        <MotionItem className="lp-card relative isolate overflow-hidden rounded-3xl p-7 sm:p-9">
          <span aria-hidden className="absolute inset-x-8 top-0 -z-10 h-24 rounded-full bg-destructive/10 blur-2xl" />
          <span aria-hidden className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-destructive/50 to-transparent" />
          <h3 className="lp-display text-3xl text-foreground">Without {BRAND_NAME}</h3>
          <ul className="mt-7 space-y-4">
            {WITHOUT.map((line) => (
              <li key={line} className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <X className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </MotionItem>

        <MotionItem className="lp-card relative isolate flex flex-col overflow-hidden rounded-3xl p-7 shadow-xl sm:p-9">
          <span aria-hidden className="absolute inset-x-8 top-0 -z-10 h-24 rounded-full bg-(--lp-accent)/15 blur-2xl" />
          <span aria-hidden className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-(--lp-accent)/60 to-transparent" />
          <h3 className="lp-display text-3xl text-foreground">With {BRAND_NAME}</h3>
          <ul className="mt-7 space-y-4">
            {WITH.map((line) => (
              <li key={line} className="flex items-start gap-3 text-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-(--lp-accent) text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <StartLink size="sm" className="mt-8 self-start" />
        </MotionItem>
      </MotionStagger>
    </Section>
  );
}
