export function getChatSidebarClassName(isCollapsed: boolean): string {
  return [
    "hidden md:flex relative z-0 shrink-0 flex-col overflow-hidden border-r border-border/40 bg-card/50 transition-[width] duration-300 ease-in-out",
    isCollapsed ? "md:w-[3.5rem]" : "md:w-[300px] lg:w-[340px]",
  ].join(" ");
}
