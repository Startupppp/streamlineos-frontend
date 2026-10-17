"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { BRAND_NAME } from "@/lib/branding";
import { isPublicWaitlistMode, publicCtaHref } from "@/lib/waitlist-mode";
import { cn } from "@/lib/utils";
import { MotionReveal } from "../components/motion/motion-reveal";
import { REVEAL, VIEWPORT_EARLY } from "./motion";

export const CONTAINER = "mx-auto w-full max-w-7xl px-5 sm:px-8";

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-16 sm:py-24", className)}>
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  title,
  lede,
  align = "center",
  className,
}: {
  title: ReactNode;
  lede?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <MotionReveal
      viewport={VIEWPORT_EARLY}
      transition={REVEAL}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      <h2 className="lp-display text-balance text-5xl text-foreground sm:text-6xl">{title}</h2>
      {lede ? (
        <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lede}
        </p>
      ) : null}
    </MotionReveal>
  );
}

/** The one primary action on the page. Large buttons spell out the product; the navbar keeps it short. */
export function StartLink({
  className,
  size = "lg",
  tone = "dark",
}: {
  className?: string;
  size?: "sm" | "lg";
  tone?: "dark" | "light";
}) {
  const pathname = usePathname();
  const waitlist = isPublicWaitlistMode();
  return (
    <Link
      href={publicCtaHref(pathname)}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full font-medium shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        size === "lg" ? "h-12 px-6 text-sm" : "h-9 px-4 text-sm",
        tone === "dark" ? "bg-(--lp-ink) text-(--lp-canvas)" : "bg-(--lp-surface) text-(--lp-ink)",
        className,
      )}
    >
      {waitlist ? "Join the waitlist" : size === "lg" ? `Try ${BRAND_NAME} free` : "Start free"}
      <ArrowRight
        className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

/** The three promises that sit under every large call to action. */
export function Assurances({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm",
        tone === "dark" ? "text-(--lp-ink)/70" : "text-white/85",
        className,
      )}
    >
      {[`Free for up to ${PRICING.freeSeatLimit} people`, "No card required", "Live in under 30 minutes"].map((item) => (
        <li key={item} className="flex items-center gap-1.5">
          <Check className={cn("size-4", tone === "dark" && "text-(--lp-accent)")} strokeWidth={2.5} aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
