import type { LucideIcon } from "lucide-react";

export interface BuildHeaderAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost";
  /** At most one. Rendered last on desktop and kept visible on mobile. */
  primary?: boolean;
  disabled?: boolean;
  /** Shows the shared pending spinner on this control alone (FE-80). */
  isPending?: boolean;
  loadingLabel?: string;
}

export const BUILD_HEADER_OVERFLOW_LABEL = "More actions";

/** FE-101: three visible actions at most, exactly one of them primary. */
export const BUILD_HEADER_DESKTOP_VISIBLE = 3;
/** One row below `sm`, so two equal columns at most. */
export const BUILD_HEADER_MOBILE_VISIBLE = 2;

export interface BuildHeaderActionsPlan {
  isEmpty: boolean;
  desktopInline: BuildHeaderAction[];
  desktopOverflow: BuildHeaderAction[];
  mobileInline: BuildHeaderAction[];
  mobileOverflow: BuildHeaderAction[];
}

export function planBuildHeaderActions(
  actions: readonly BuildHeaderAction[],
): BuildHeaderActionsPlan {
  const primary = actions.find((action) => action.primary);
  const secondary = actions.filter((action) => action !== primary);

  const desktopSecondarySlots =
    BUILD_HEADER_DESKTOP_VISIBLE - (primary ? 1 : 0);
  const desktopSecondary = secondary.slice(0, desktopSecondarySlots);
  const desktopOverflow = secondary.slice(desktopSecondarySlots);
  const desktopInline = primary
    ? [...desktopSecondary, primary]
    : desktopSecondary;

  const fitsOneMobileRow = actions.length <= BUILD_HEADER_MOBILE_VISIBLE;
  const mobileInline = fitsOneMobileRow
    ? desktopInline
    : primary
      ? [primary]
      : secondary.slice(0, 1);
  const mobileOverflow = fitsOneMobileRow
    ? []
    : primary
      ? secondary
      : secondary.slice(1);

  return {
    isEmpty: actions.length === 0,
    desktopInline,
    desktopOverflow,
    mobileInline,
    mobileOverflow,
  };
}
