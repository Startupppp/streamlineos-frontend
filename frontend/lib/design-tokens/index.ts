/**
 * The design token vocabulary.
 *
 * globals.css owns the values; this owns the names. Application code that needs
 * a token by role — a status tone, a density mode — reads it here rather than
 * retyping a class string, and `tokens.test.ts` fails if the two ever disagree.
 */

/**
 * A taxonomy is not a status.
 *
 * Twelve places in this codebase colour a *category* — a sidebar product, a
 * notification type, an e-sign recipient, a tenant's own pipeline stage.
 * Mapping those onto the status tones makes one category read as a warning and
 * another as a notice, so they get their own scale.
 *
 * `fill` is the role the status tones lack: a category dot is a solid colour,
 * and a pale surface renders an invisible dot.
 */
export const CATEGORY_HUES = [
  "blue",
  "emerald",
  "violet",
  "amber",
  "rose",
  "cyan",
  "pink",
  "slate",
] as const;
export type CategoryHue = (typeof CATEGORY_HUES)[number];

export const CATEGORY_ROLES = ["surface", "ink", "rule", "fill"] as const;
export type CategoryRole = (typeof CATEGORY_ROLES)[number];

export interface CategoryClasses {
  surface: string;
  ink: string;
  rule: string;
  /** Solid, for a dot or a bar. */
  fill: string;
}

/**
 * Written out rather than assembled, for the same reason the status tones are:
 * Tailwind emits a utility only when it finds the class as a literal string, so
 * a template produces markup referencing CSS that was never generated.
 */
const CATEGORY_CLASSES: Readonly<Record<CategoryHue, CategoryClasses>> = {
  blue: { surface: "bg-category-blue-surface", ink: "text-category-blue-ink", rule: "border-category-blue-rule", fill: "bg-category-blue-fill" },
  emerald: { surface: "bg-category-emerald-surface", ink: "text-category-emerald-ink", rule: "border-category-emerald-rule", fill: "bg-category-emerald-fill" },
  violet: { surface: "bg-category-violet-surface", ink: "text-category-violet-ink", rule: "border-category-violet-rule", fill: "bg-category-violet-fill" },
  amber: { surface: "bg-category-amber-surface", ink: "text-category-amber-ink", rule: "border-category-amber-rule", fill: "bg-category-amber-fill" },
  rose: { surface: "bg-category-rose-surface", ink: "text-category-rose-ink", rule: "border-category-rose-rule", fill: "bg-category-rose-fill" },
  cyan: { surface: "bg-category-cyan-surface", ink: "text-category-cyan-ink", rule: "border-category-cyan-rule", fill: "bg-category-cyan-fill" },
  pink: { surface: "bg-category-pink-surface", ink: "text-category-pink-ink", rule: "border-category-pink-rule", fill: "bg-category-pink-fill" },
  slate: { surface: "bg-category-slate-surface", ink: "text-category-slate-ink", rule: "border-category-slate-rule", fill: "bg-category-slate-fill" },
};

export function categoryClasses(hue: CategoryHue): CategoryClasses {
  return CATEGORY_CLASSES[hue];
}

/** The badge a taxonomy entry wears: surface, ink and rule as one string. */
export function categoryBadgeClass(hue: CategoryHue): string {
  const c = CATEGORY_CLASSES[hue];
  return `${c.surface} ${c.ink} ${c.rule}`;
}

export const STATUS_TONES = ["success", "warning", "danger", "info", "neutral"] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

export const STATUS_ROLES = ["surface", "ink", "ink-strong", "rule", "fill", "fill-hover"] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

export const DENSITY_MODES = ["comfortable", "compact"] as const;
export type DensityMode = (typeof DENSITY_MODES)[number];

/**
 * `control` and `accent` are separate roles, not sizes of `raised`.
 *
 * `raised` says "above the page". `control` is the lift a primary button takes
 * and is neutral, because it sits under text of any colour. `accent` is the
 * brand glow an interactive surface takes on hover, and says "reachable"
 * rather than "above".
 */
export const ELEVATIONS = ["panel", "card", "raised", "control", "accent", "accent-strong"] as const;
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
  /** Solid, with white text on it — a primary button, a filled dot. */
  fill: string;
  /** A separate token, not an opacity change: transparency washes out on dark. */
  fillHover: string;
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
