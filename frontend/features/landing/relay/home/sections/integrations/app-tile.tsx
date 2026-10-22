"use client";

import { animated, to, useSpring } from "@react-spring/web";

import type { IntegrationsApp } from "@/features/landing/relay/data/integrations";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

type AppTileProps = Pick<IntegrationsApp, "name" | "initials"> & {
  align: "start" | "center" | "end";
  shown: boolean;
  active: boolean;
  in1024?: boolean;
  in390?: boolean;
};

const CENTRED_390 = "w390:left-1/2 w390:-translate-x-1/2 w390:text-center";

const LABEL_ALIGN: Record<AppTileProps["align"], string> = {
  start: `left-0 text-left ${CENTRED_390}`,
  center: "left-1/2 -translate-x-1/2 text-center",
  end: `-right-0.5 w1024:right-0 text-right w390:right-auto ${CENTRED_390}`,
};

const frameClass = (in1024: boolean, in390: boolean) =>
  [
    in1024 ? "" : "w1024:hidden",
    in390 === in1024 ? "" : in390 ? "w390:block" : "w390:hidden",
  ]
    .filter(Boolean)
    .join(" ");

export const AppTile = ({
  name,
  initials,
  align,
  shown,
  active,
  in1024 = true,
  in390 = true,
}: AppTileProps) => {
  const pop = useSpring({
    s: shown ? 1 : 0.8,
    o: shown ? 1 : 0,
    immediate: !shown,
    config: SPRING_SOFT,
  });
  const look = useSpring({
    a: active ? 1 : 0,
    config: SPRING_SOFT,
  });
  const idle = look.a.to((a) => 1 - a);

  return (
    <animated.li
      className={`relative size-15 w390:size-14 ${frameClass(in1024, in390)}`}
      style={{ opacity: pop.o }}
    >
      <animated.div
        aria-hidden="true"
        className="relative size-15 w390:size-14 overflow-clip rounded-integrations-tile backdrop-blur-integrations-tile"
        style={{
          transform: to([pop.s, look.a], (s, a) => {
            const k = s * (1 + 0.06 * a);
            return k === 1 ? "none" : `scale(${k})`;
          }),
        }}
      >
        <animated.span
          className="absolute inset-0 flex items-center justify-center rounded-integrations-tile border border-integrations-tile-border bg-linear-to-b/srgb from-integrations-tile-from to-integrations-tile-to bg-origin-border text-foreground-muted"
          style={{ opacity: idle }}
        >
          <span className="font-mono text-relay-label w390:text-integrations-initials-390 leading-label tracking-integrations-initials whitespace-nowrap">
            {initials}
          </span>
        </animated.span>
        <animated.span
          className="absolute inset-0 flex items-center justify-center rounded-integrations-tile border border-integrations-active-border bg-(image:--integrations-active-fill) bg-origin-border text-accent"
          style={{ opacity: look.a }}
        >
          <span className="font-mono text-relay-label w390:text-integrations-initials-390 leading-label tracking-integrations-initials whitespace-nowrap">
            {initials}
          </span>
        </animated.span>
      </animated.div>
      <span
        className={`absolute top-19.5 w1024:top-19 w390:top-17 w-20 font-mono text-relay-label leading-label text-foreground-muted ${LABEL_ALIGN[align]}`}
      >
        {name}
      </span>
    </animated.li>
  );
};
