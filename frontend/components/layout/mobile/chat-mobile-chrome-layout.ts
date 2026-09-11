const CHAT_MOBILE_BOTTOM_INSET =
  "max-sm:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]";

export function getChatMobileBottomNavClassName(): string {
  return "sm:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md";
}

export function getChatMobileContentPaddingClassName(
  isConversationOpen: boolean,
): string {
  return isConversationOpen ? "max-sm:pb-0" : CHAT_MOBILE_BOTTOM_INSET;
}

export function getChatMobileComposerInsetClassName(): string {
  return CHAT_MOBILE_BOTTOM_INSET;
}
