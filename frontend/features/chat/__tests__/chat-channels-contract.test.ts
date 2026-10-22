import type { Channel, ChannelPage, PublicChannel } from "@/types/chat";

type ChannelsPage = ChannelPage<Channel>;
type PublicChannelsPage = ChannelPage<PublicChannel>;

const selectChannels = (page: ChannelsPage) => page.channels;
const selectPublicChannels = (page: PublicChannelsPage) => page.channels;

describe("channel list response contract", () => {
  it("projects the paginated envelope down to the array consumers render", () => {
    const page: ChannelsPage = {
      channels: [
        { id: 1, name: "general", type: "PUBLIC" },
        { id: 2, name: "random", type: "PUBLIC" },
      ] as unknown as ChannelsPage["channels"],
      nextCursor: "cursor-2",
    };

    const selected = selectChannels(page);

    expect(Array.isArray(selected)).toBe(true);
    expect(selected).toHaveLength(2);
    expect(() => selected.filter((c) => c.name.includes("gen"))).not.toThrow();
    expect(selected.filter((c) => c.name.includes("gen"))).toHaveLength(1);
  });

  it("an empty page still projects to an array, never undefined", () => {
    const page: ChannelsPage = { channels: [], nextCursor: null };
    expect(selectChannels(page)).toEqual([]);
  });

  it("public channels use the same envelope", () => {
    const page: PublicChannelsPage = {
      channels: [{ id: 7, name: "announcements" }] as unknown as PublicChannelsPage["channels"],
      nextCursor: null,
    };
    expect(selectPublicChannels(page)).toHaveLength(1);
  });

  it("the envelope itself is not an array — the shape the cast used to hide", () => {
    const page: ChannelsPage = { channels: [], nextCursor: null };
    expect(Array.isArray(page)).toBe(false);
    expect("channels" in page).toBe(true);
    expect("nextCursor" in page).toBe(true);
  });
});
