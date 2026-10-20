import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelInfoPanel } from "./channel-info-panel";

const mockArchive = jest.fn();
const mockUnarchive = jest.fn();
const mockUnpin = jest.fn();
const mockChannel = jest.fn();

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatChannel: () => ({ data: mockChannel() }),
  useChatOnlineUsers: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/chat-search", () => ({
  useChatPins: () => ({
    data: [
      {
        id: 1,
        messageId: 44,
        message: {
          content: "Ship it Friday",
          attachments: [],
          sender: { name: "Ada", image: null },
        },
      },
    ],
  }),
  useUnpinMessage: () => ({ mutate: mockUnpin, isPending: false }),
}));

jest.mock("@/hooks/api/chat-personal-b", () => ({
  useArchiveChannel: () => ({ mutateAsync: mockArchive, isPending: false }),
  useUnarchiveChannel: () => ({ mutateAsync: mockUnarchive, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({ XIcon: () => null }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

jest.mock("./channel-info-panel-profile", () => ({ ChannelInfoPanelProfile: () => null }));
jest.mock("./channel-members-section", () => ({
  ChannelMembersSection: () => <section aria-label="Members" />,
}));
jest.mock("./conversation-notification-settings", () => ({
  ConversationNotificationSettings: () => <section aria-label="Notifications" />,
}));

jest.mock("next/dynamic", () => () => {
  function SharedFilesStub({ channelId }: { channelId: number }) {
    return <div>{`shared files for ${channelId}`}</div>;
  }
  return SharedFilesStub;
});

function channel(archivedAt: string | null) {
  return {
    id: 9,
    type: "PUBLIC",
    name: "launch",
    createdAt: "2026-01-01T00:00:00.000Z",
    members: [
      {
        userId: "user-1",
        role: "ADMIN",
        archivedAt,
        mutedUntil: null,
        notificationPreference: "ALL",
        user: { id: "user-1", name: "Ada", image: null },
      },
    ],
  };
}

function renderPanel(archivedAt: string | null = null) {
  mockChannel.mockReturnValue(channel(archivedAt));
  const onArchived = jest.fn();
  render(
    <ChannelInfoPanel channelId={9} currentUserId="user-1" onClose={jest.fn()} onArchived={onArchived} />,
  );
  return { onArchived };
}

beforeEach(() => {
  mockArchive.mockReset().mockResolvedValue(undefined);
  mockUnarchive.mockReset().mockResolvedValue(undefined);
  mockUnpin.mockReset();
});

describe("ChannelInfoPanel — one details surface owns the conversation scope", () => {
  it("holds members, pins and notification settings on the About tab", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: "About" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Members" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("Ship it Friday")).toBeInTheDocument();
  });

  it("holds the conversation's shared files on the Files tab", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: "Files" }));
    expect(await screen.findByText("shared files for 9")).toBeInTheDocument();
  });

  it("does not offer saved messages, which are user-global rather than per conversation", () => {
    renderPanel();
    expect(screen.queryByRole("tab", { name: /saved/i })).toBeNull();
  });
});

describe("ChannelInfoPanel — lifecycle actions are confirmed", () => {
  it("asks before archiving and only archives after confirm", async () => {
    const user = userEvent.setup();
    const { onArchived } = renderPanel();
    await user.click(screen.getByRole("button", { name: "Archive chat" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(mockArchive).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith(9));
    await waitFor(() => expect(onArchived).toHaveBeenCalled());
  });

  it("cancelling the archive confirmation changes nothing", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Archive chat" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("asks before unpinning a message", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Unpin message" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(mockUnpin).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Unpin" }));
    expect(mockUnpin).toHaveBeenCalledWith({ channelId: 9, messageId: 44 });
  });

  it("restores an archived chat without a confirmation because nothing is lost", async () => {
    const user = userEvent.setup();
    renderPanel("2026-02-01T00:00:00.000Z");
    await user.click(screen.getByRole("button", { name: "Unarchive chat" }));
    await waitFor(() => expect(mockUnarchive).toHaveBeenCalledWith(9));
  });
});
