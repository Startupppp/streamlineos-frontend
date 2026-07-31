export const FIELD_CONTROL_CLASS =
  "box-border h-9 rounded-md border border-input bg-card text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";

export const FIELD_CONTROL_INVALID_CLASS =
  "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive";

export const FIELD_CONTROL_HOVER_CLASS = "hover:border-primary/40";

export const FIELD_CONTROL_DISABLED_CLASS =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted";

export const FIELD_SELECT_CONTENT_CLASS = "min-w-[var(--radix-select-trigger-width)]";

/**
 * Match the trigger as a MINIMUM, then grow with the content, capped at the
 * space Radix reports as available. A bare `w-[--radix-popover-trigger-width]`
 * pins the panel to a narrow trigger and clips long option labels.
 */
export const FIELD_POPOVER_CONTENT_CLASS =
  "min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[var(--radix-popover-content-available-width)]";

export const FIELD_SEARCH_POPOVER_CONTENT_CLASS =
  "min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[var(--radix-popover-content-available-width)]";

export const COMPACT_SEARCH_POPOVER_CONTENT_CLASS =
  "min-w-[max(16rem,var(--radix-popover-trigger-width))] w-auto max-w-[min(24rem,var(--radix-popover-content-available-width))]";

export const FIELD_DATE_POPOVER_CONTENT_CLASS =
  "min-w-[var(--radix-popover-trigger-width)] w-auto";

export const INLINE_POPOVER_MIN_CLASS = "min-w-[var(--radix-popover-trigger-width)]";
