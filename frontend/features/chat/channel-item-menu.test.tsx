import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelItemMenu } from "./channel-item-menu";
import type { Channel } from "@/types/chat";

const mockArchive = jest.fn();

jest.mock("@/hooks/api/chat-personal-b", () => ({
  useArchiveChannel: () => ({ mutateAsync: mockArchive, isPending: false }),
  useFavoriteChannel: () => ({ mutateAsync: jest.fn() }),
  useUnfavoriteChannel: () => ({ mutateAsync: jest.fn() }),
  useMarkChannelUnread: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@animateicons/react/lucide", () => ({ EllipsisIcon: () => null }));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));
jest.mock("./add-channel-members-dialog", () => ({ AddChannelMembersDialog: () => null }));
jest.mock("./channel-notification-submenu", () => ({ ChannelNotificationSubmenu: () => null }));

const channel = {
  id: 5,
  type: "PUBLIC",
  name: "design",
  unreadCount: 0,
  members: [{ role: "MEMBER", user: { id: "u1", name: "Ada", image: null } }],
} as unknown as Channel;

async function openHideDialog(user: ReturnType<typeof userEvent.setup>) {
  render(<ChannelItemMenu channel={channel} currentUserId="u1" />);
  await user.click(screen.getByRole("button", { name: "Conversation options" }));
  await user.click(await screen.findByRole("menuitem", { name: /Hide Until New Message/ }));
  return screen.findByRole("alertdialog");
}

beforeEach(() => {
  mockArchive.mockReset().mockResolvedValue(undefined);
});

describe("ChannelItemMenu — hide is confirmed", () => {
  it("names the conversation and cancelling performs no mutation", async () => {
    const user = userEvent.setup();
    const dialog = await openHideDialog(user);
    expect(within(dialog).getByText("Hide #design?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("confirming hides exactly once", async () => {
    const user = userEvent.setup();
    const dialog = await openHideDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Hide conversation" }));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledTimes(1));
    expect(mockArchive).toHaveBeenCalledWith(5);
  });
});
