import { conversationConfirmName } from "./channel-member-lookup";
import type { ChannelMember } from "@/types/chat";

function member(id: string, name: string): ChannelMember {
  return { user: { id, name, image: null } } as unknown as ChannelMember;
}

describe("conversationConfirmName", () => {
  it("prefixes a channel name with #", () => {
    expect(conversationConfirmName({ type: "PUBLIC", name: "design" }, "u1")).toBe("#design");
  });

  it("uses the other person for a DM", () => {
    const members = [member("u1", "Me"), member("u2", "Grace")];
    expect(conversationConfirmName({ type: "DIRECT", name: null, members }, "u1")).toBe("Grace");
  });
});
