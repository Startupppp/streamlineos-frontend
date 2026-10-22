"use client";

import { useRef } from "react";

import { TypeText } from "@/features/landing/relay/components/ui/type-text";
import type { ScaleContent } from "@/features/landing/relay/data/scale";
import { REVEAL } from "@/features/landing/relay/lib/motion";

import { ScaleCard } from "./card";
import { RuntimeHub } from "./runtime-hub";
import { ScaleType } from "./scale-type";

type RuntimeCardProps = ScaleContent["runtime"] & { index: number };

const MONO_DIM =
  "font-mono text-scale-mono leading-scale-mono text-foreground-dim";

export const RuntimeCard = ({
  title,
  copy,
  label,
  caption,
  apps,
  index,
}: RuntimeCardProps) => {
  const top = useRef<HTMLParagraphElement>(null);
  return (
    <ScaleCard
      title={title}
      copy={copy}
      index={index}
      clipArt={false}
      artClassName="w390:h-62.75"
    >
      <RuntimeHub label={label} apps={apps} />
      <p
        className={`absolute top-73 left-0 w-129.5 w1024:top-64 w1024:left-0 w1024:w-89.5 w768:top-74 w768:w-160 w390:top-59 w390:w-77.5 ${MONO_DIM}`}
      >
        <ScaleType trigger={top} delay={(index + 5) * REVEAL.step}>
          {`${caption} `}
        </ScaleType>
      </p>
      <p
        ref={top}
        className={`absolute top-6 left-0 w-129.5 w1024:top-0 w1024:left-0 w1024:w-89.5 w768:top-6 w768:w-160 w390:top-0 w390:w-77.5 ${MONO_DIM}`}
      >
        <TypeText delay={(index + 2) * REVEAL.step}>{`${label} `}</TypeText>
      </p>
    </ScaleCard>
  );
};
