"use client";

import { animated, useSprings } from "@react-spring/web";
import { useEffect, useState } from "react";

import type { PricingContent } from "@/features/landing/relay/data/pricing";
import { REVEAL, SPRING_SOFT } from "@/features/landing/relay/lib/motion";

import { INITIAL, RunMeter, planIndex } from "./run-meter";
import { TierCard } from "./tier-card";

type PlanBoardProps = {
  meter: PricingContent["meter"];
  tiers: PricingContent["tiers"];
};

const STACKED = "w768:h-77.75 w768:w-full w768:flex-none";
const TIER_SIZE = {
  plain: `h-full basis-0 grow w1024:h-108.5 w1024:basis-[calc(50%_-_--spacing(1.5))] w1024:grow-0 ${STACKED} w390:h-104.25`,
  featured: `h-full basis-0 grow w1024:h-108.5 w1024:basis-[calc(50%_-_--spacing(1.5))] w1024:grow-0 ${STACKED} w390:h-105.75`,
} as const;
const tierSize = (tier: PricingContent["tiers"][number]) =>
  TIER_SIZE[tier.featured ? "featured" : "plain"];

const BOX =
  "absolute top-120 left-20 h-99.5 w-320 w1024:top-151.5 w1024:left-12 w1024:h-220 w1024:w-232 w768:top-168.25 w768:left-10 w768:h-320 w768:w-172 w390:top-200.5 w390:left-5 w390:h-427.5 w390:w-87.5";
const GAP = "flex gap-5 w1024:flex-wrap w1024:gap-3 w768:flex-col w768:flex-nowrap";
const ROW = `${BOX} ${GAP}`;
const LAYER = `absolute inset-0 ${GAP}`;

const useCanHover = () => {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCan(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return can;
};

export const PlanBoard = ({ meter, tiers }: PlanBoardProps) => {
  const [pos, setPos] = useState<number>(INITIAL);
  const [hover, setHover] = useState<number | null>(null);
  const canHover = useCanHover();
  const selected = planIndex(pos, tiers);
  const lit = canHover && hover !== null ? hover : selected;

  const [marks] = useSprings(
    tiers.length,
    (n) => ({ o: n === lit ? 1 : 0, config: SPRING_SOFT }),
    [lit],
  );

  return (
    <>
      
      <div
        className="absolute top-39.5 left-20 h-75.5 w-320 overflow-clip rounded-pricing-card border border-pricing-card-border bg-pricing-card backdrop-blur-card w1024:top-71.5 w1024:left-12 w1024:h-77 w1024:w-232 w768:top-59.5 w768:left-10 w768:h-105.75 w768:w-172 w390:top-62 w390:left-5 w390:h-135.5 w390:w-87.5"
      >
        <RunMeter meter={meter} tiers={tiers} pos={pos} onPos={setPos} />
      </div>

      <div aria-hidden="true" className={`pointer-events-none ${ROW}`}>
        {marks.map(({ o }, n) => (
          <animated.span
            key={tiers[n].name}
            className={`shrink-0 rounded-pricing-card shadow-pricing-featured ${tierSize(tiers[n])}`}
            style={{ opacity: o }}
          />
        ))}
      </div>

      <ul className={ROW}>
        {tiers.map((tier, n) => (
          <li key={tier.name} className={`shrink-0 ${tierSize(tiers[n])}`}>
            <div
              className="size-full"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover((h) => (h === n ? null : h))}
            >
              <TierCard
                tier={tier}
                delay={(n + 2) * REVEAL.step}
                lit={n === lit}
              />
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden="true" className={`pointer-events-none ${BOX}`}>
        <div className={LAYER}>
          {marks.map(({ o }, n) => (
            <animated.span
              key={tiers[n].name}
              className={`stroke-ring shrink-0 rounded-pricing-card [background:var(--pricing-featured-stroke)] ${tierSize(tiers[n])}`}
              style={{ opacity: o }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
