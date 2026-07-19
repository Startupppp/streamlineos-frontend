import { getChatSidebarClassName } from "./chat-shell-layout";

describe("getChatSidebarClassName", () => {
  it("hides desktop chat chrome below the md breakpoint", () => {
    expect(getChatSidebarClassName(false)).toContain("hidden md:flex");
  });

  it("keeps the collapsed rail desktop-only", () => {
    expect(getChatSidebarClassName(true)).toContain("md:w-[3.5rem]");
    expect(getChatSidebarClassName(true)).not.toContain("w-14");
  });
});
