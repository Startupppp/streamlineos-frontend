"use client";

import { useReducedMotion } from "@react-spring/web";
import type { ReactNode } from "react";

import { SpringTrigger } from "@/features/landing/relay/components/animation/springs/spring-trigger";

const DRIFT = 40;

export const BloomDrift = ({
  direction,
  children,
}: {
  direction: 1 | -1;
  children: ReactNode;
}) => {
  const reduced = useReducedMotion();
  const range = reduced ? 0 : DRIFT * direction;

  return (
    <SpringTrigger
      mode="scrub"
      className="absolute inset-0"
      innerClassName="absolute inset-0"
      from={{ y: -range }}
      to={{ y: range }}
    >
      {children}
    </SpringTrigger>
  );
};
