
export const SPRING = { tension: 280, friction: 32 } as const;

export const SPRING_SOFT = { tension: 120, friction: 26 } as const;

export const STEP = 70;

export const REVEAL = {
  from: { opacity: 0, y: 24 },
  to: { opacity: 1, y: 0 },
  step: STEP,
} as const;

export const FADE = {
  from: { opacity: 0 },
  to: { opacity: 1 },
} as const;
