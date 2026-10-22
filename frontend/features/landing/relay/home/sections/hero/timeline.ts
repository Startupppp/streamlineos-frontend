import { STEP } from "@/features/landing/relay/lib/motion";

export const LOAD = {
  copy: {
    chip: 0,
    chipType: 120,
    title: STEP,
    subhead: 2 * STEP,
    actions: 3 * STEP,
    note: 4 * STEP,
    noteType: 4 * STEP + 120,
  },
  frame: 0,
  grid: 192,
  chrome: 288,
  nodes: [416, 416 + 0.8 * STEP, 416 + 1.6 * STEP, 416 + 2.4 * STEP],
  connectorsIn: 608,
  connectors: 688,
  targetPort: 896,
  status: 896,
  runs: 800,
  stream: 416,
  packet: 944,
} as const;

export const LIVE = {
  trip: 720,
  period: 1920,
  greyEvery: 3,
  flash: 416,
  runEvery: 4000,
  rowPitch: 2.125,
  rowPitch1024: 1.75,
} as const;

export const TILT = {
  deg: 12,
  perspective: 1400,
  bloom: 60,
  depth: { grid: 10, flow: 22, front: 34 },
} as const;
