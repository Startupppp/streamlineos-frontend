import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

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
    <section id={id} className={cn("scroll-mt-20 py-16 sm:py-24", className)}>
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  title,
  lede,
  className,
}: {
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-balance text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground">
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
