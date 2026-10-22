"use client";

import { animated, useSpring } from "@react-spring/web";
import { useRef, type RefObject } from "react";

import { FocusText } from "@/features/landing/relay/components/ui/focus-text";
import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { useSeen } from "@/features/landing/relay/hooks/use-seen";

import type { PricingContent } from "@/features/landing/relay/data/pricing";
import { SPRING, SPRING_SOFT, STEP } from "@/features/landing/relay/lib/motion";

const FAST = 40;

import { Check } from "./check";
import { GlassTierButton } from "./glass-tier-button";
import { TEAM_CTA_BOX, TeamCta } from "./team-cta";
import { TypeLabel } from "./type-label";

type Tier = PricingContent["tiers"][number];

const FEATURE_SIZE = {
  label: "text-relay-label leading-label w768:text-body w768:leading-body",
  body: "text-body leading-body",
} as const;

const POP = { tension: 320, friction: 17 } as const;

const HEAD = {
  plain: {
    name: "w1024:top-5.75",
    price: "w1024:top-14.25 w768:top-16.75 w390:top-14.25",
    list: "w1024:top-39.25 w768:top-33.25 w390:top-37.75",
    rule: "w390:top-76.75",
    button: "w390:top-83",
    shade: "w390:top-86.5",
  },
  featured: {
    name: "w1024:top-7.25 w768:top-7.75 w390:top-7.25",
    price: "w1024:top-15.75 w768:top-18.75 w390:top-15.75",
    list: "w1024:top-39.25 w768:top-35.25 w390:top-39.25",
    rule: "w390:top-78.25",
    button: "w390:top-84.5",
    shade: "w390:top-88",
  },
} as const;

const ROW_HEIGHT = {
  label: "h-8 w1024:h-9 w768:h-8 w390:h-9",
  body: "h-8 w1024:h-9 w768:h-8 w390:h-9",
} as const;

const MASK =
  "linear-gradient(90deg, black calc(var(--reveal) - 40%), transparent var(--reveal))";

const BUTTON_BOX =
  "absolute top-79.25 right-7.75 left-7.75 w1024:top-87.25 w1024:right-5.75 w1024:left-5.75 w768:top-59.5 w768:h-12 w390:right-4.75 w390:left-4.75 w390:h-15";

export const TierCard = ({
  tier,
  delay,
  lit,
}: {
  tier: Tier;
  delay: number;
  lit: boolean;
}) => {
  const look = useSpring({ l: lit ? 1 : 0, config: SPRING_SOFT });
  const card = useRef<HTMLElement>(null);
  const seen = useSeen(card);
  const head = HEAD[tier.featured ? "featured" : "plain"];

  return (
    <article
      ref={card}
      className="relative size-full overflow-clip rounded-pricing-card border border-pricing-card-border bg-pricing-card backdrop-blur-card"
    >
      <TypeLabel
        tag="h3"
        delay={delay}
        className={`absolute! top-7.75 left-7.75 font-mono text-relay-label leading-label whitespace-nowrap text-foreground-muted w1024:left-5.75 w390:left-4.75 ${head.name}`}
      >
        {tier.name}
      </TypeLabel>
      
      <div
        className={`absolute top-14.25 left-7.75 flex flex-col items-start gap-2.5 whitespace-nowrap w1024:left-5.75 w1024:gap-1 w768:flex-row w768:items-end w768:gap-3 w390:left-4.75 w390:flex-col w390:items-start w390:gap-1 ${head.price}`}
      >
        <FocusText
          delay={delay + STEP}
          className="text-pricing-price leading-pricing-price font-semibold tracking-title text-foreground"
        >
          {tier.price}
        </FocusText>
        <p className="font-mono text-relay-label leading-label text-foreground-dim w768:mb-1.75 w390:mb-0">
          <TypeLabel
            delay={delay + 2 * STEP}
            trigger={card as RefObject<HTMLElement>}
          >
            {tier.period}
          </TypeLabel>
        </p>
      </div>

      {"tag" in tier && (
        <InviewSeen
          tag="p"
          mode="once"
          from={{ opacity: 0, scale: 0.6 }}
          to={{ opacity: 1, scale: 1 }}
          config={POP}
          delayIn={delay + 4 * STEP}
          className="absolute top-7.75 right-7.75 rounded-pricing-tag bg-linear-135 from-brand-from to-brand-to px-3 py-1.5 font-mono text-relay-label leading-label whitespace-nowrap text-on-accent w1024:top-5.75 w1024:right-5.75 w1024:py-2 w390:right-4.75"
        >
          {tier.tag}
        </InviewSeen>
      )}

      <ul
        className={`absolute top-40.25 left-7.75 flex flex-col w1024:left-5.75 w768:grid w768:grid-cols-2 w768:gap-x-6 w390:gap-x-0 w390:left-4.75 w390:flex ${head.list}`}
      >
        {tier.features.map((feature, n) => (
          <li
            key={feature.label}
            className={`flex items-start gap-2.5 w1024:gap-3.5 ${ROW_HEIGHT[feature.size]}`}
          >
            <Check
              light={tier.featured}
              seen={seen}
              delay={delay + (1 + n) * FAST}
            />
            <InviewSeen
              tag="span"
              mode="once"
              trigger={card as RefObject<HTMLElement>}
              from={{ opacity: 0, filter: "blur(8px)", "--reveal": "0%" }}
              to={{ opacity: 1, filter: "blur(0px)", "--reveal": "140%" }}
              config={SPRING}
              delayIn={delay + (2 + n) * FAST}
              style={{ maskImage: MASK, WebkitMaskImage: MASK }}
              className={`w-55 text-foreground-muted w1024:w-57.25 w768:w-71 w390:w-71.5 ${FEATURE_SIZE[feature.size]}`}
            >
              {feature.label}
            </InviewSeen>
          </li>
        ))}
      </ul>

      
      <span
        aria-hidden="true"
        className={`absolute top-81.25 left-5.75 hidden h-px w-63.25 bg-pricing-hairline w1024:block w768:top-53.5 w768:w-160 w390:left-4.75 w390:w-77.5 ${head.rule}`}
      />

      
      <animated.div
        aria-hidden={lit}
        inert={lit}
        className="absolute inset-0"
        style={{
          opacity: look.l.to((l) => 1 - l),
          pointerEvents: lit ? "none" : "auto",
        }}
      >
        <span
          aria-hidden="true"
          className={`absolute top-82.75 right-8.75 left-8.75 h-10 rounded-full bg-pricing-button-shade blur-pricing-button-shade w1024:top-90.75 w1024:right-6.75 w1024:left-6.75 w1024:h-13 w768:top-63 w768:h-10 w390:right-5.75 w390:left-5.75 w390:h-13 ${head.shade}`}
        />
        <GlassTierButton
          href={tier.cta.href}
          className={`${BUTTON_BOX} ${head.button}`}
        >
          {tier.cta.label}
        </GlassTierButton>
      </animated.div>
      <animated.div
        aria-hidden={!lit}
        inert={!lit}
        className="absolute inset-0"
        style={{ opacity: look.l, pointerEvents: lit ? "auto" : "none" }}
      >
        <TeamCta
          href={tier.cta.href}
          label={tier.cta.label}
          className={
            tier.featured
              ? TEAM_CTA_BOX
              : `${BUTTON_BOX} h-12 w1024:h-15 w768:h-12 w390:h-15 ${head.button}`
          }
        />
      </animated.div>
    </article>
  );
};
