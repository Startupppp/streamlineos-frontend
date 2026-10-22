"use client";

import { createContext, useContext } from "react";

export interface StatementMotion {
  seen: boolean;
  inView: boolean;
  reduced: boolean;
}

export const StatementMotionContext = createContext<StatementMotion>({
  seen: false,
  inView: false,
  reduced: false,
});

export const useStatementSeen = () => useContext(StatementMotionContext);

export const TIMELINE = {
  tile: 0,
  title: 380,
  titleStep: 60,
  kicker: 460,
  stem: 1150,
  nowPop: 1600,
  wave: 1750,
  caption: 1800,
  chevronEvery: 4000,
} as const;

export const WAVE = { pass: 1600, hold: 3600 } as const;

export const DROP = { tension: 260, friction: 15 } as const;
export const POP = { tension: 420, friction: 14 } as const;

export const TYPE_CLIP =
  "[clip-path:inset(0_calc(100%_-_round(down,_calc(var(--typed)_*_1ch_+_0.5px),_1ch)_-_0.1ch)_0_0)]!";
