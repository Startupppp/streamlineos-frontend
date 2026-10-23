const CHAT_MOBILE_BOTTOM_INSET =
  "max-lg:pb-[calc(2.75rem+0.5rem+env(safe-area-inset-bottom))]";

export function getChatMobileBottomNavClassName(): string {
  return "lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md [[data-scroll-locked]_&]:hidden";
}

export function getChatMobileBottomNavItemsClassName(): string {
  return "grid h-11 grid-cols-5 items-center px-1";
}

export function getChatMobileContentPaddingClassName(
  isConversationOpen: boolean,
): string {
  return isConversationOpen ? "max-lg:pb-0" : CHAT_MOBILE_BOTTOM_INSET;
}

export function getChatMobileComposerInsetClassName(): string {
  return CHAT_MOBILE_BOTTOM_INSET;
}
