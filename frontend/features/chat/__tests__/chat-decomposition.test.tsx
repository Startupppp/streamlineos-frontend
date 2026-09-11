import { render, screen } from "@testing-library/react";
import { convertToTaskSchema } from "../convert-to-task-dialog-schema";
import { ChannelMembersSection } from "../channel-members-section";
import type { ChannelMember } from "@/types/chat";

jest.mock("@/hooks/api", () => ({
  useActiveHuddle: () => ({ data: undefined }),
  useRemoveChannelMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("../channel-member-row", () => ({
  ChannelMemberRow: ({ member }: { member: ChannelMember }) => (
    <div data-testid="member-row">{member.user?.name}</div>
  ),
}));

jest.mock("../add-channel-members-dialog", () => ({
  AddChannelMembersDialog: () => null,
}));

function makeMember(id: string, name: string): ChannelMember {
  return {
    id: Number(id),
    channelId: 1,
    userId: id,
    role: "MEMBER",
    joinedAt: new Date().toISOString(),
    lastReadAt: null,
    archivedAt: null,
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    user: { id, name, image: null },
  };
}

describe("convert-to-task schema (ITEM: schema extraction)", () => {
  it("accepts valid input", () => {
    const result = convertToTaskSchema.safeParse({
      title: "Fix bug",
      projectId: "123",
      type: "TASK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = convertToTaskSchema.safeParse({
      title: "",
      projectId: "123",
      type: "TASK",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing projectId", () => {
    const result = convertToTaskSchema.safeParse({
      title: "Fix bug",
      projectId: "",
      type: "BUG",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown type", () => {
    const result = convertToTaskSchema.safeParse({
      title: "Fix bug",
      projectId: "1",
      type: "FEATURE",
    });
    expect(result.success).toBe(false);
  });
});

describe("ChannelMembersSection (ITEM: channel-info-panel split)", () => {
  const baseProps = {
    channelId: 1,
    currentUserId: "u1",
    members: [] as ChannelMember[],
    isAdmin: false,
    isMultiMemberChannel: true,
    onlineUserIds: new Set<string>(),
    onClose: jest.fn(),
  };

  it("renders 'Members (0)' when empty", () => {
    render(<ChannelMembersSection {...baseProps} />);
    expect(screen.getByText("Members (0)")).toBeTruthy();
  });

  it("renders online and offline member rows", () => {
    const alice = makeMember("u1", "Alice");
    const bob = makeMember("u2", "Bob");
    render(
      <ChannelMembersSection
        {...baseProps}
        members={[alice, bob]}
        onlineUserIds={new Set(["u1"])}
      />,
    );
    const rows = screen.getAllByTestId("member-row");
    expect(rows).toHaveLength(2);
  });

  it("shows online / offline section headings when members exist", () => {
    const alice = makeMember("u1", "Alice");
    const bob = makeMember("u2", "Bob");
    render(
      <ChannelMembersSection
        {...baseProps}
        members={[alice, bob]}
        onlineUserIds={new Set(["u1"])}
      />,
    );
    expect(screen.getByText(/^Online/)).toBeTruthy();
    expect(screen.getByText(/^Offline/)).toBeTruthy();
  });

  it("shows Add button when isAdmin and isMultiMemberChannel", () => {
    render(
      <ChannelMembersSection
        {...baseProps}
        isAdmin
        isMultiMemberChannel
      />,
    );
    expect(screen.getByText("Add")).toBeTruthy();
  });

  it("hides Add button for non-admin", () => {
    render(
      <ChannelMembersSection
        {...baseProps}
        isAdmin={false}
        isMultiMemberChannel
      />,
    );
    expect(screen.queryByText("Add")).toBeNull();
  });
});
