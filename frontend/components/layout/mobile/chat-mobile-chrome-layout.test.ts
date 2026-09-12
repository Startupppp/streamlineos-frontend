import {
  getChatMobileBottomNavClassName,
  getChatMobileComposerInsetClassName,
  getChatMobileContentPaddingClassName,
} from "./chat-mobile-chrome-layout";

describe("chat mobile chrome layout", () => {
  it("shows the chat navigation everywhere the desktop chat panes are hidden, i.e. below md", () => {
    expect(getChatMobileBottomNavClassName()).toContain("md:hidden");
    expect(getChatMobileBottomNavClassName()).not.toContain("sm:hidden");
  });

  it("removes reserved navigation space inside a conversation", () => {
    expect(getChatMobileContentPaddingClassName(true)).toBe("max-md:pb-0");
  });

  it("keeps safe-area space for the conversation list across the whole band the nav covers", () => {
    expect(getChatMobileContentPaddingClassName(false)).toContain(
      "max-md:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("clears the bottom nav under the message composer", () => {
    expect(getChatMobileComposerInsetClassName()).toBe(
      "max-md:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
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
