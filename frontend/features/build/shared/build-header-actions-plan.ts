import type { LucideIcon } from "lucide-react";

export interface BuildHeaderAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost";
  primary?: boolean;
  disabled?: boolean;
  isPending?: boolean;
  loadingLabel?: string;
}

export const BUILD_HEADER_OVERFLOW_LABEL = "More actions";

export const BUILD_HEADER_DESKTOP_VISIBLE = 3;
export const BUILD_HEADER_MOBILE_VISIBLE = 2;

export interface BuildHeaderActionsPlan {
  isEmpty: boolean;
  desktopInline: BuildHeaderAction[];
  desktopOverflow: BuildHeaderAction[];
  mobileInline: BuildHeaderAction[];
  mobileOverflow: BuildHeaderAction[];
  mobileColumns: string;
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

  const mobileColumns =
    mobileOverflow.length > 0
      ? "grid-cols-[1fr_auto]"
      : mobileInline.length >= BUILD_HEADER_MOBILE_VISIBLE
        ? "grid-cols-2"
        : "grid-cols-1";

  return {
    isEmpty: actions.length === 0,
    desktopInline,
    desktopOverflow,
    mobileInline,
    mobileOverflow,
    mobileColumns,
  };
}
