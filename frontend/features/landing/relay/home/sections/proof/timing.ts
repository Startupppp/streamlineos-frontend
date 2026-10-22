import { STEP } from "@/features/landing/relay/lib/motion";

export const PROOF_TIMING = {
  hairlineTop: 3 * STEP,
  hairlineBottom: 5 * STEP,
  column: (i: number) => 3 * STEP + i * 2 * STEP,
  number: STEP,
  caption: 2 * STEP,
  visual: 3 * STEP,
  visualLength: { sparkline: 880, hours: 1000, progress: 1600 },
  count: 1400,
  visualStagger: (i: number) => i * 1.6 * STEP,
  quoteStagger: (i: number) => i * 90,
  quoteName: 150,
  quoteRole: 220,
} as const;
