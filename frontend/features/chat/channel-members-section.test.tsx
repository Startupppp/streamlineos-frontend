/**
 * `channel.members` rides the channel payload with no cursor and no cap, so the
 * info panel mounted one row per member of the channel — an org-wide channel
 * put its whole headcount into a 320px column. The two groups are windowed
 * independently, and each row still carries its position in its own group.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelMembersSection } from "./channel-members-section";
import { PANEL_RENDER_PAGE_SIZE } from "./panel-render-window";
import type { ChannelMember } from "@/types/chat";

jest.mock("@/hooks/api", () => ({
  useActiveHuddle: () => ({ data: undefined }),
  useRemoveChannelMember: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("./channel-member-row", () => ({
  ChannelMemberRow: ({ member }: { member: { user: { name: string } | null } }) => (
    <span>{member.user?.name}</span>
  ),
}));

jest.mock("./add-channel-members-dialog", () => ({
  AddChannelMembersDialog: () => null,
}));

function makeMembers(count: number): ChannelMember[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    channelId: 1,
    userId: `user-${i + 1}`,
    role: "MEMBER" as const,
    lastReadAt: null,
    joinedAt: null,
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "ALL" as const,
    user: { id: `user-${i + 1}`, name: `Member ${i + 1}`, image: null },
  }));
}

const noop = () => undefined;

function renderSection(count: number, onlineIds: Set<string> = new Set()) {
  return render(
    <ChannelMembersSection
      channelId={1}
      currentUserId="user-1"
      members={makeMembers(count)}
      isAdmin={false}
      isMultiMemberChannel
      onlineUserIds={onlineIds}
      onClose={noop}
    />,
  );
}

describe("ChannelMembersSection — the mounted row count is bounded", () => {
  it("mounts one page of rows for a 500-member channel, not 500", () => {
    renderSection(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("mounts every row when the channel already fits inside one page", () => {
    renderSection(9);
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull();
  });

  it("windows the online and offline groups independently", () => {
    const online = new Set(Array.from({ length: 200 }, (_, i) => `user-${i + 1}`));
    renderSection(500, online);
    const onlineList = screen.getByRole("list", { name: "Online members" });
    const offlineList = screen.getByRole("list", { name: "Offline members" });
    expect(within(onlineList).getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
    expect(within(offlineList).getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });
});

describe("ChannelMembersSection — no member is lost behind the bound", () => {
  it("names how many remain, and reaches row 51 of the group through that control", async () => {
    const user = userEvent.setup();
    const inDisplayOrder = Array.from({ length: 500 }, (_, i) => `Member ${i + 1}`).sort((a, b) =>
      a.localeCompare(b),
    );
    const beyondFirstPage = inDisplayOrder[PANEL_RENDER_PAGE_SIZE * 2];
    expect(beyondFirstPage).toBeDefined();
    renderSection(500);
    expect(screen.queryByText(String(beyondFirstPage))).toBeNull();
    await user.click(screen.getByRole("button", { name: /show 25 more \(25 of 500\)/i }));
    await user.click(screen.getByRole("button", { name: /show 25 more \(50 of 500\)/i }));
    expect(screen.getByText(String(beyondFirstPage))).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 3);
  });

  it("still reports the true member count in the heading", () => {
    renderSection(500);
    expect(screen.getByText("Members (500)")).toBeInTheDocument();
  });

  it("gives each row its position in the whole group", () => {
    renderSection(500);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-posinset", "1");
    expect(rows[0]).toHaveAttribute("aria-setsize", "500");
  });
});
