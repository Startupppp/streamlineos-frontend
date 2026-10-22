export type StatTone =
  | "default"
  | "accent"
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "violet";

export type StatColor = StatTone | "cyan" | "green" | "gold" | "purple";

export interface StatCardWash {
  surface: string;
  rule: string;
  ink: string;
}

export const STAT_CARD_PALETTE: readonly StatCardWash[] = [
  {
    surface: "bg-category-blue-surface",
    rule: "border-category-blue-rule",
    ink: "text-category-blue-ink",
  },
  {
    surface: "bg-category-emerald-surface",
    rule: "border-category-emerald-rule",
    ink: "text-category-emerald-ink",
  },
  {
    surface: "bg-category-amber-surface",
    rule: "border-category-amber-rule",
    ink: "text-category-amber-ink",
  },
  {
    surface: "bg-category-violet-surface",
    rule: "border-category-violet-rule",
    ink: "text-category-violet-ink",
  },
  {
    surface: "bg-category-rose-surface",
    rule: "border-category-rose-rule",
    ink: "text-category-rose-ink",
  },
  {
    surface: "bg-category-cyan-surface",
    rule: "border-category-cyan-rule",
    ink: "text-category-cyan-ink",
  },
  {
    surface: "bg-category-orange-surface",
    rule: "border-category-orange-rule",
    ink: "text-category-orange-ink",
  },
  {
    surface: "bg-category-indigo-surface",
    rule: "border-category-indigo-rule",
    ink: "text-category-indigo-ink",
  },
];

const ACCENT_WASH: StatCardWash = {
  surface: "bg-primary/10",
  rule: "border-primary/25",
  ink: "text-primary",
};

const TONE_WASH: Record<StatTone, StatCardWash | null> = {
  default: null,
  accent: ACCENT_WASH,
  blue: STAT_CARD_PALETTE[0],
  violet: STAT_CARD_PALETTE[3],
  emerald: {
    surface: "bg-status-success-surface",
    rule: "border-status-success-rule",
    ink: "text-status-success-ink",
  },
  amber: {
    surface: "bg-status-warning-surface",
    rule: "border-status-warning-rule",
    ink: "text-status-warning-ink",
  },
  red: {
    surface: "bg-status-danger-surface",
    rule: "border-status-danger-rule",
    ink: "text-status-danger-ink",
  },
};

const COLOR_WASH: Record<Exclude<StatColor, StatTone>, StatCardWash> = {
  cyan: STAT_CARD_PALETTE[5],
  green: STAT_CARD_PALETTE[1],
  gold: STAT_CARD_PALETTE[2],
  purple: STAT_CARD_PALETTE[3],
};

function paletteSlot(index: number): number {
  const count = STAT_CARD_PALETTE.length;
  return ((Math.trunc(index) % count) + count) % count;
}

function labelSlot(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 33 + label.charCodeAt(i)) >>> 0;
  }
  return paletteSlot(hash);
}

export function statCardPaletteWash(index: number): StatCardWash {
  return STAT_CARD_PALETTE[paletteSlot(index)];
}

export function resolveStatCardWash(input: {
  tone?: StatTone;
  color?: StatColor;
  index?: number;
  label: string;
}): StatCardWash | null {
  if (input.tone) return TONE_WASH[input.tone];
  if (input.color) {
    if (input.color in TONE_WASH) return TONE_WASH[input.color as StatTone];
    return COLOR_WASH[input.color as Exclude<StatColor, StatTone>];
  }
  const slot =
    typeof input.index === "number" && Number.isFinite(input.index)
      ? input.index
      : labelSlot(input.label);
  return statCardPaletteWash(slot);
}
