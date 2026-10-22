
export type Waypoint = {
  at: string;
  x: number;
  y: number;
  z: number;
  pinch?: number;
};

const HERO = {
  1440: [
    { at: "hero", x: 1.14, y: -0.46, z: -2.6 },
    { at: "hero", x: 0.84, y: 0.02, z: -1.8 },
    { at: "hero", x: 0.5, y: 0.3, z: -0.9 },
    { at: "hero", x: 0.22, y: 0.66, z: 0, pinch: 1 },
  ],
  1024: [
    { at: "hero", x: 1.08, y: -0.4, z: -2.6 },
    { at: "hero", x: 0.86, y: 0.03, z: -1.8 },
    { at: "hero", x: 0.5, y: 0.35, z: -0.9 },
    { at: "hero", x: 0.22, y: 0.7, z: 0, pinch: 1 },
  ],
  768: [
    { at: "hero", x: 1.08, y: 0.12, z: -2.4 },
    { at: "hero", x: 0.8, y: 0.4, z: -1.6 },
    { at: "hero", x: 0.3, y: 0.6, z: -0.8 },
    { at: "hero", x: -0.02, y: 0.8, z: 0, pinch: 1 },
  ],
  390: [
    { at: "hero", x: 1.1, y: 0.2, z: -2.4 },
    { at: "hero", x: 0.75, y: 0.45, z: -1.6 },
    { at: "hero", x: 0.25, y: 0.65, z: -0.8 },
    { at: "hero", x: -0.02, y: 0.84, z: 0, pinch: 1 },
  ],
} as const satisfies Record<number, readonly Waypoint[]>;

const TAIL: readonly Waypoint[] = [
  { at: "integrations", x: 0.48, y: -0.25, z: 0 },
  { at: "integrations", x: 0.605, y: 0.54, z: -0.2 },
  { at: "product", x: 0.5, y: 0.12, z: 0.2 },
  { at: "product", x: -0.06, y: 0.5, z: 0.2, pinch: 1 },
  { at: "statement", x: 0.5, y: 0.3, z: -0.5 },
  { at: "scale", x: 0.92, y: 0.9, z: 0.2, pinch: 1 },
  { at: "signals", x: 0.4, y: 0.75, z: -0.4 },
  { at: "proof", x: -0.06, y: 0.6, z: 0.2, pinch: 1 },
  { at: "pricing", x: 0.46, y: -0.1, z: -0.2 },
  { at: "pricing", x: 0.96, y: 0.35, z: 0.1, pinch: 0.8 },
  { at: "pricing", x: 0.48, y: 0.85, z: 0 },
  { at: "pricing", x: -0.49, y: 1.04, z: 0 },
];

export const PATH = {
  1440: [...HERO[1440], ...TAIL],
  1024: [...HERO[1024], ...TAIL],
  768: [...HERO[768], ...TAIL],
  390: [...HERO[390], ...TAIL],
} as const satisfies Record<number, readonly Waypoint[]>;

const SHIFT = 200 / 1440;

export type PagePoint = { x: number; y: number; z: number; pinch: number };

const blockOf = (el: HTMLElement) => {
  let block = el;
  for (
    let node: HTMLElement | null = el;
    node && node.tagName !== "MAIN";
    node = node.parentElement
  ) {
    if (getComputedStyle(node).position === "sticky" && node.parentElement) {
      block = node.parentElement;
    }
  }
  return block;
};

const docTop = (el: HTMLElement) => {
  let y = 0;
  for (
    let node: HTMLElement | null = el;
    node;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null
  ) {
    y += node.offsetTop;
  }
  return y;
};

export const resolvePath = (
  waypoints: readonly Waypoint[],
  main: HTMLElement,
): PagePoint[] => {
  const column = main.getBoundingClientRect();
  const points: PagePoint[] = [];
  for (const { at, x, y, z, pinch = 0 } of waypoints) {
    const section = document.getElementById(at);
    if (!section) continue;
    const block = blockOf(section);
    points.push({
      x: column.left + (x + SHIFT) * column.width,
      y: docTop(block) + y * block.offsetHeight,
      z,
      pinch,
    });
  }
  return points;
};
