/**
 * The design token vocabulary.
 *
 * globals.css owns the values; this owns the names. Application code that needs
 * a token by role — a status tone, a density mode — reads it here rather than
 * retyping a class string, and `tokens.test.ts` fails if the two ever disagree.
 */

export const STATUS_TONES = ["success", "warning", "danger", "info", "neutral"] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

export const STATUS_ROLES = ["surface", "ink", "ink-strong", "rule"] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

export const DENSITY_MODES = ["comfortable", "compact"] as const;
export type DensityMode = (typeof DENSITY_MODES)[number];

export const ELEVATIONS = ["panel", "card", "raised"] as const;
export type Elevation = (typeof ELEVATIONS)[number];

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
export type SpacingRole = (typeof SPACING_ROLES)[number];

export const DENSITY_SPACING_ROLES = ["control-h", "row-h", "card-pad", "stack-gap"] as const;
export type DensitySpacingRole = (typeof DENSITY_SPACING_ROLES)[number];

/** The custom property a status token is declared as in globals.css. */
export function statusVar(tone: StatusTone, role: StatusRole): string {
  return `--status-${tone}-${role}`;
}

export interface StatusToneClasses {
  surface: string;
  ink: string;
  inkStrong: string;
  rule: string;
}

/**
 * Tailwind classes for one status tone.
 *
 * Both themes come for free: the class points at a custom property, and the
 * property is redefined under `.dark`. That is the whole point — a literal like
 * `bg-emerald-50` needs a hand-written `dark:` twin, and roughly half of the
 * existing call sites forgot theirs.
 *
 * Written out rather than assembled from the tone name. Tailwind generates a
 * utility only when it finds the class as a literal string in a source file, so
 * a template like `bg-status-${tone}-surface` produces markup that references
 * CSS which was never emitted, and the tone renders unstyled.
 */
const STATUS_TONE_CLASSES: Readonly<Record<StatusTone, StatusToneClasses>> = {
  success: {
    surface: "bg-status-success-surface",
    ink: "text-status-success-ink",
    inkStrong: "text-status-success-ink-strong",
    rule: "border-status-success-rule",
  },
  warning: {
    surface: "bg-status-warning-surface",
    ink: "text-status-warning-ink",
    inkStrong: "text-status-warning-ink-strong",
    rule: "border-status-warning-rule",
  },
  danger: {
    surface: "bg-status-danger-surface",
    ink: "text-status-danger-ink",
    inkStrong: "text-status-danger-ink-strong",
    rule: "border-status-danger-rule",
  },
  info: {
    surface: "bg-status-info-surface",
    ink: "text-status-info-ink",
    inkStrong: "text-status-info-ink-strong",
    rule: "border-status-info-rule",
  },
  neutral: {
    surface: "bg-status-neutral-surface",
    ink: "text-status-neutral-ink",
    inkStrong: "text-status-neutral-ink-strong",
    rule: "border-status-neutral-rule",
  },
};

export function statusToneClasses(tone: StatusTone): StatusToneClasses {
  return STATUS_TONE_CLASSES[tone];
}

/** Same reason as above: the scanner has to see each one written out. */
const TYPE_SCALE_CLASSES: Readonly<Record<TypeScaleStep, string>> = {
  micro: "text-micro",
  dense: "text-dense",
  label: "text-label",
};

export function typeScaleClass(step: TypeScaleStep): string {
  return TYPE_SCALE_CLASSES[step];
}

/** Applied to the document root; absent means comfortable. */
export function densityAttribute(mode: DensityMode): Record<string, string> {
  return mode === "compact" ? { "data-density": "compact" } : {};
}
