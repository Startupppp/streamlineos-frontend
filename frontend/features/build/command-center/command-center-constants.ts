import { cn } from "@/lib/utils";

export const MY_ISSUES_LOAD_MORE_THRESHOLD = 120;

const COMMAND_CENTER_LIST_PANEL_HEIGHT =
  "max-h-[min(50dvh,24rem)] lg:h-[min(380px,calc(100dvh-24rem))]";

export const COMMAND_CENTER_LIST_PANEL = cn(
  "flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden",
  COMMAND_CENTER_LIST_PANEL_HEIGHT,
);

export const COMMAND_CENTER_PANEL_BODY_SCROLL = "min-h-0 min-w-0 max-w-full flex-1";

export const COMMAND_CENTER_PAGE_SHELL =
  "flex-none min-h-min min-w-0 w-full max-w-full overflow-x-hidden overflow-y-visible";

export const COMMAND_CENTER_JUMP_PANEL =
  "flex min-w-0 w-full max-w-full flex-col overflow-hidden p-2.5";

export const COMMAND_CENTER_PANELS_GRID =
  "grid min-w-0 w-full max-w-full gap-4 lg:grid-cols-5 lg:items-stretch";
