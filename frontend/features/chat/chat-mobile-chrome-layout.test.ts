import {
  getChatMobileBottomNavClassName,
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
      "max-sm:pb-[calc(4rem+env(safe-area-inset-bottom))]",
    );
  });
});
