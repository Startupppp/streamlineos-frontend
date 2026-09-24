import {
  getChatMobileBottomNavClassName,
  getChatMobileBottomNavItemsClassName,
  getChatMobileComposerInsetClassName,
  getChatMobileContentPaddingClassName,
} from "./chat-mobile-chrome-layout";

describe("chat mobile chrome layout", () => {
  it("shows the chat navigation everywhere the desktop chat panes are hidden, i.e. below lg", () => {
    expect(getChatMobileBottomNavClassName()).toContain("lg:hidden");
    expect(getChatMobileBottomNavClassName()).not.toContain("sm:hidden");
    expect(getChatMobileBottomNavClassName()).not.toContain("md:hidden");
  });

  it("keeps the five mobile actions evenly reachable", () => {
    expect(getChatMobileBottomNavItemsClassName()).toContain("grid-cols-5");
  });

  it("removes reserved navigation space inside a conversation", () => {
    expect(getChatMobileContentPaddingClassName(true)).toBe("max-lg:pb-0");
  });

  it("keeps safe-area space for the conversation list across the whole band the nav covers", () => {
    expect(getChatMobileContentPaddingClassName(false)).toContain(
      "max-lg:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("clears the bottom nav under the message composer", () => {
    expect(getChatMobileComposerInsetClassName()).toBe(
      "max-lg:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("reserves space over exactly the band in which the nav is mounted", () => {
    const navBreakpoint = /(?:^|\s)(\w+):hidden(?:\s|$)/.exec(
      getChatMobileBottomNavClassName(),
    );
    expect(navBreakpoint?.[1]).toBeDefined();
    for (const inset of [
      getChatMobileContentPaddingClassName(false),
      getChatMobileComposerInsetClassName(),
    ])
      expect(inset).toContain(`max-${navBreakpoint?.[1]}:pb-`);
  });
});
