const CHAT_PANE_CHROME =
  "relative z-0 shrink-0 flex-col overflow-hidden border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out";

function paneWidthClassName(isCollapsed: boolean): string {
  return isCollapsed ? "lg:w-[3.5rem]" : "lg:w-[340px]";
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
    "relative z-20 w-full shrink-0 flex-col overflow-visible border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out",
    paneWidthClassName(isCollapsed),
  ].join(" ");
}

export function getChatMessagePaneClassName(
  isConversationListVisible: boolean,
): string {
  return [
    "relative z-10 min-w-0 flex-1 flex-col",
    isConversationListVisible ? "hidden lg:flex" : "flex",
  ].join(" ");
}
