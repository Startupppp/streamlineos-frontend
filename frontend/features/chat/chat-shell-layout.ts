const CHAT_PANE_CHROME =
  "relative z-0 shrink-0 flex-col overflow-hidden border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out";

function paneWidthClassName(isCollapsed: boolean): string {
  return isCollapsed ? "md:w-[3.5rem]" : "md:w-[300px] lg:w-[340px]";
}

export function getChatSidebarClassName(isCollapsed: boolean): string {
  return [
    "hidden lg:flex",
    CHAT_PANE_CHROME,
    paneWidthClassName(isCollapsed),
  ].join(" ");
}

export function getChatConversationListPaneClassName(
  isCollapsed: boolean,
  isMobileListVisible: boolean,
): string {
  return [
    isMobileListVisible ? "flex" : "hidden lg:flex",
    "w-full",
    CHAT_PANE_CHROME,
    paneWidthClassName(isCollapsed),
  ].join(" ");
}
