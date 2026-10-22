"use client";

import { animated, useSpring } from "@react-spring/web";
import Image from "next/image";

import type { FooterContent } from "@/features/landing/relay/data/footer";
import { SPRING } from "@/features/landing/relay/lib/motion";

import { CUE, CueFade, useStageReady } from "./stage";

const PLACE = [
  "left-20 w1024:left-12 w768:left-10 w390:left-5",
  "left-147 w1024:left-76.5 w768:left-66 w390:top-5 w390:left-5",
  "left-260 w1024:left-164.75 w768:left-130.75 w390:top-10 w390:left-5",
] as const;

const Dot = ({ lit, delay }: { lit: boolean; delay: number }) => {
  const { on } = useSpring({
    on: lit ? 1 : 0,
    config: SPRING,
    delay: lit ? delay : 0,
  });

  return (
    <animated.span
      aria-hidden="true"
      className="block size-1.5 shrink-0"
      style={{
        opacity: on.to((o) => 0.2 + 0.8 * o),
        scale: on.to((o) => 0.6 + 0.4 * o),
      }}
    >
      <Image
        src="/landing/relay/footer/footer-status-dot.svg"
        alt=""
        width={6}
        height={6}
        className="size-1.5"
      />
    </animated.span>
  );
};

export const StatusRow = ({ statuses }: Pick<FooterContent, "statuses">) => {
  const lit = useStageReady("top");

  return (
    <ul className="absolute top-116 left-0 h-5 w-full w1024:top-81.5 w768:top-162 w390:top-173.25 w390:h-15">
      {statuses.map((status, i) => {
        const at = CUE.status + i * CUE.statusStep;
        return (
          <li
            key={status.label}
            className={`absolute top-0 flex items-center gap-2 font-mono text-relay-label leading-label whitespace-nowrap text-foreground-muted ${PLACE[i]}`}
          >
            <Dot lit={lit} delay={at} />
            <CueFade stage="top" tag="span" delay={at + 60}>
              <span className="w768:hidden">{status.label}</span>
              <span className="hidden w768:inline">{status.short}</span>
            </CueFade>
          </li>
        );
      })}
    </ul>
  );
};
