

export const STATUS_TONES = ["success", "warning", "danger", "info", "neutral"] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

export const STATUS_ROLES = ["surface", "ink", "ink-strong", "rule", "fill", "fill-hover"] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

export const DENSITY_MODES = ["comfortable", "compact"] as const;
export type DensityMode = (typeof DENSITY_MODES)[number];

export const ELEVATIONS = ["panel", "card", "raised", "control", "accent", "accent-strong"] as const;


export const TYPE_SCALE = ["micro", "dense", "label"] as const;
export type TypeScaleStep = (typeof TYPE_SCALE)[number];

export const SPACING_ROLES = [
  "gap-inline",
  "gap-field",
  "gap-toolbar",
  "gap-grid",
  "gap-section",
  "card",
  "card-compact",
] as const;


export const DENSITY_SPACING_ROLES = ["control-h", "row-h", "card-pad", "stack-gap"] as const;


export function statusVar(tone: StatusTone, role: StatusRole): string {
  return `--status-${tone}-${role}`;
}

export interface StatusToneClasses {
  surface: string;
  ink: string;
  inkStrong: string;
  rule: string;
  fill: string;
  fillHover: string;
}

const STATUS_TONE_CLASSES: Readonly<Record<StatusTone, StatusToneClasses>> = {
  success: {
    surface: "bg-status-success-surface",
    ink: "text-status-success-ink",
    inkStrong: "text-status-success-ink-strong",
    rule: "border-status-success-rule",
    fill: "bg-status-success-fill",
    fillHover: "hover:bg-status-success-fill-hover",
  },
  warning: {
    surface: "bg-status-warning-surface",
    ink: "text-status-warning-ink",
    inkStrong: "text-status-warning-ink-strong",
    rule: "border-status-warning-rule",
    fill: "bg-status-warning-fill",
    fillHover: "hover:bg-status-warning-fill-hover",
  },
  danger: {
    surface: "bg-status-danger-surface",
    ink: "text-status-danger-ink",
    inkStrong: "text-status-danger-ink-strong",
    rule: "border-status-danger-rule",
    fill: "bg-status-danger-fill",
    fillHover: "hover:bg-status-danger-fill-hover",
  },
  info: {
    surface: "bg-status-info-surface",
    ink: "text-status-info-ink",
    inkStrong: "text-status-info-ink-strong",
    rule: "border-status-info-rule",
    fill: "bg-status-info-fill",
    fillHover: "hover:bg-status-info-fill-hover",
  },
  neutral: {
    surface: "bg-status-neutral-surface",
    ink: "text-status-neutral-ink",
    inkStrong: "text-status-neutral-ink-strong",
    rule: "border-status-neutral-rule",
    fill: "bg-status-neutral-fill",
    fillHover: "hover:bg-status-neutral-fill-hover",
  },
};

export function statusToneClasses(tone: StatusTone): StatusToneClasses {
  return STATUS_TONE_CLASSES[tone];
}

const TYPE_SCALE_CLASSES: Readonly<Record<TypeScaleStep, string>> = {
  micro: "text-micro",
  dense: "text-dense",
  label: "text-label",
};

export function typeScaleClass(step: TypeScaleStep): string {
  return TYPE_SCALE_CLASSES[step];
}

export function densityAttribute(mode: DensityMode): Record<string, string> {
  return mode === "compact" ? { "data-density": "compact" } : {};
}
