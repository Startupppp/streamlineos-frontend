import type { LucideIcon } from "lucide-react";

export interface BuildHeaderAction {
  id: string;
  label: string;
  ariaLabel?: string;
  title?: string;
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
const BUILD_HEADER_MOBILE_VISIBLE = 2;

interface BuildHeaderActionsPlan {
  isEmpty: boolean;
  desktopInline: BuildHeaderAction[];
  desktopOverflow: BuildHeaderAction[];
  mobileInline: BuildHeaderAction[];
  mobileOverflow: BuildHeaderAction[];
  mobileColumns: string;
}

function promoteLoneOverflow(
  inline: BuildHeaderAction[],
  overflow: BuildHeaderAction[],
  primary: BuildHeaderAction | undefined,
): { inline: BuildHeaderAction[]; overflow: BuildHeaderAction[] } {
  if (overflow.length !== 1) {
    return { inline, overflow };
  }
  const lone = overflow[0];
  if (primary && inline.at(-1) === primary) {
    return {
      inline: [...inline.slice(0, -1), lone, primary],
      overflow: [],
    };
  }
  return { inline: [...inline, lone], overflow: [] };
}

export function planBuildHeaderActions(
  actions: readonly BuildHeaderAction[],
): BuildHeaderActionsPlan {
  const primary = actions.find((action) => action.primary);
  const secondary = actions.filter((action) => action !== primary);

  const desktopSecondarySlots =
    BUILD_HEADER_DESKTOP_VISIBLE - (primary ? 1 : 0);
  const desktopSecondary = secondary.slice(0, desktopSecondarySlots);
  const desktopOverflowRaw = secondary.slice(desktopSecondarySlots);
  const desktopInlineBase = primary
    ? [...desktopSecondary, primary]
    : desktopSecondary;
  const desktop = promoteLoneOverflow(
    desktopInlineBase,
    desktopOverflowRaw,
    primary,
  );

  const fitsOneMobileRow = actions.length <= BUILD_HEADER_MOBILE_VISIBLE;
  const mobileInlineRaw = fitsOneMobileRow
    ? desktop.inline
    : primary
      ? [primary]
      : secondary.slice(0, 1);
  const mobileOverflowRaw = fitsOneMobileRow
    ? []
    : primary
      ? secondary
      : secondary.slice(1);
  const mobile = promoteLoneOverflow(
    mobileInlineRaw,
    mobileOverflowRaw,
    primary,
  );

  const mobileColumns =
    mobile.overflow.length > 0
      ? "grid-cols-[1fr_auto]"
      : mobile.inline.length >= BUILD_HEADER_MOBILE_VISIBLE
        ? "grid-cols-2"
        : "grid-cols-1";

  return {
    isEmpty: actions.length === 0,
    desktopInline: desktop.inline,
    desktopOverflow: desktop.overflow,
    mobileInline: mobile.inline,
    mobileOverflow: mobile.overflow,
    mobileColumns,
  };
}
