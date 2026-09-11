import {
  getChatMobileBottomNavClassName,
  getChatMobileComposerInsetClassName,
  getChatMobileContentPaddingClassName,
} from "./chat-mobile-chrome-layout";

describe("chat mobile chrome layout", () => {
  it("shows the chat navigation only below sm", () => {
    expect(getChatMobileBottomNavClassName()).toContain("sm:hidden");
  });

  it("removes reserved navigation space inside a conversation", () => {
    expect(getChatMobileContentPaddingClassName(true)).toBe("max-sm:pb-0");
  });

  it("keeps safe-area space for the conversation list", () => {
    expect(getChatMobileContentPaddingClassName(false)).toContain(
      "max-sm:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("clears the bottom nav under the message composer", () => {
    expect(getChatMobileComposerInsetClassName()).toBe(
      "max-sm:pb-[calc(4rem+0.5rem+env(safe-area-inset-bottom))]",
    );
  });
});
