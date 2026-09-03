import { render, screen } from "@testing-library/react";
import { resolveDirectPartner, findOwnMember } from "../channel-member-lookup";
import { ChannelMemberRow } from "../channel-member-row";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Channel, ChannelMember } from "@/types/chat";

jest.mock("@/hooks/api", () => ({ useChatOnlineUsers: () => ({ data: [] }) }));

/**
 * The payload the backend actually sends, asserted here as data rather than as a cast.
 *
 * `hooks/api/chat-core-read.ts` reads the detail route with `apiClient.get<Channel>(...)`, so
 * nothing at runtime checks the response against `ChannelMember`. The API shipped
 * `members[].membership.user`; this interface declared `user` flat. Both repos typechecked green
 * and every DIRECT header rendered "Unknown".
 *
 * `DETAIL_MEMBER` and `PREVIEW_MEMBER` are the exact key sets the backend's
 * `chat-channel-member-wire-shape.spec.ts` asserts the routes emit. If the API's shape moves, that
 * spec goes red; if this interface moves away from it, these do.
 */
const ME = "user-me";
const OTHER = "user-other";

const DETAIL_MEMBER: ChannelMember = {
  id: 2,
  channelId: 7,
  userId: OTHER,
  role: "MEMBER",
  lastReadAt: null,
  joinedAt: null,
  mutedUntil: null,
  archivedAt: null,
  isFavorite: false,
  notificationPreference: "DEFAULT",
  user: { id: OTHER, name: "Ada Lovelace", image: null, email: "ada@test.com" },
};

const MY_MEMBER: ChannelMember = {
  ...DETAIL_MEMBER,
  id: 1,
  userId: ME,
  role: "ADMIN",
  isFavorite: true,
  user: { id: ME, name: "Me", image: null, email: "me@test.com" },
};

/** The list preview: same keys, `user.email` withheld to keep the 50-channel page small. */
const PREVIEW_MEMBER: ChannelMember = {
  ...DETAIL_MEMBER,
  user: { id: OTHER, name: "Ada Lovelace", image: null },
};

const DIRECT_CHANNEL = {
  id: 7,
  type: "DIRECT",
  name: "Me & Ada Lovelace",
  members: [MY_MEMBER, DETAIL_MEMBER],
} as unknown as Channel;

/** The shape as it shipped: identity two levels down, under the join table's name. */
const NESTED_MEMBER = {
  id: 2,
  channelId: 7,
  role: "MEMBER",
  isFavorite: false,
  notificationPreference: "DEFAULT",
  membership: { userId: OTHER, user: { id: OTHER, name: "Ada Lovelace", image: null } },
} as unknown as ChannelMember;

const directDisplayName = (channel: Channel, currentUserId: string) =>
  resolveDirectPartner(channel.members, currentUserId)?.name ?? "Unknown";

describe("channel member payload — the declared shape is the shape that arrives", () => {
  it("carries the user flat, never under a membership wrapper", () => {
    expect(DETAIL_MEMBER).not.toHaveProperty("membership");
    expect(DETAIL_MEMBER.user?.id).toBe(OTHER);
    expect(DETAIL_MEMBER.userId).toBe(OTHER);
  });

  it("the list preview and the detail route agree on every key but the address", () => {
    expect(Object.keys(PREVIEW_MEMBER).sort()).toEqual(Object.keys(DETAIL_MEMBER).sort());
    expect(PREVIEW_MEMBER.user?.email).toBeUndefined();
    expect(DETAIL_MEMBER.user?.email).toBe("ada@test.com");
  });
});

describe("a DIRECT channel header shows the other person, not Unknown", () => {
  it("BITE: the payload as it shipped renders Unknown", () => {
    const asShipped = { ...DIRECT_CHANNEL, members: [NESTED_MEMBER, NESTED_MEMBER] } as Channel;
    expect(directDisplayName(asShipped, ME)).toBe("Unknown");
  });

  it("resolves the other party's real name from the detail payload", () => {
    expect(directDisplayName(DIRECT_CHANNEL, ME)).toBe("Ada Lovelace");
  });

  it("resolves it from the bounded list payload too, so the sidebar and the header agree", () => {
    const listRow = { ...DIRECT_CHANNEL, members: [MY_MEMBER, PREVIEW_MEMBER] } as Channel;
    expect(directDisplayName(listRow, ME)).toBe("Ada Lovelace");
  });

  it("does not hand back the caller as their own conversation partner", () => {
    expect(resolveDirectPartner(DIRECT_CHANNEL.members, ME)?.id).not.toBe(ME);
  });

  it("skips a member whose user row is gone instead of stopping on it", () => {
    const departed: ChannelMember = { ...DETAIL_MEMBER, id: 3, userId: null, user: null };
    expect(resolveDirectPartner([departed, DETAIL_MEMBER], ME)?.name).toBe("Ada Lovelace");
  });

  it("a self-DM names the caller rather than Unknown", () => {
    expect(resolveDirectPartner([MY_MEMBER], ME)?.name).toBe("Me");
  });

  it("an empty roster is Unknown, not a crash", () => {
    expect(directDisplayName({ ...DIRECT_CHANNEL, members: [] } as Channel, ME)).toBe("Unknown");
  });
});

describe("the caller's own row drives favourites and the admin controls", () => {
  it("BITE: the payload as it shipped finds no row for the caller", () => {
    expect(findOwnMember([NESTED_MEMBER, NESTED_MEMBER], ME)).toBeUndefined();
  });

  it("finds it in the payload the API now sends", () => {
    const mine = findOwnMember(DIRECT_CHANNEL.members, ME);
    expect(mine?.isFavorite).toBe(true);
    expect(mine?.role).toBe("ADMIN");
  });
});

describe("the member row renders the identity it is given", () => {
  it("shows the member's name and address from the flat payload", () => {
    render(
      <TooltipProvider>
        <ChannelMemberRow
          member={DETAIL_MEMBER}
          currentUserId={ME}
          isOnline={false}
          isMutedInCall={false}
          isAdmin={false}
          isMultiMemberChannel={false}
          isRemoving={false}
          onRemove={jest.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Ada Lovelace")).not.toBeNull();
    expect(screen.getByText("ada@test.com")).not.toBeNull();
  });
});
