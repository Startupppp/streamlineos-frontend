import { render, screen } from "@testing-library/react";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";

interface MockUsers {
  data: undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
let mockUsers: MockUsers;

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatOrgUsers: () => mockUsers,
}));
jest.mock("@/hooks/api/chat-core-mutations-b", () => ({
  useAddChannelMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/chat-invite-links", () => ({
  useChannelInviteLink: () => ({ data: undefined, isLoading: false }),
  useRegenerateInviteLink: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@animateicons/react/lucide", () => ({ CopyIcon: () => null }));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

function renderDialog() {
  render(
    <AddChannelMembersDialog open onOpenChange={jest.fn()} channelId={1} existingMemberIds={new Set()} />,
  );
}

describe("AddChannelMembersDialog directory states (BUG-009)", () => {
  it("says it is loading instead of claiming everyone is already a member", () => {
    mockUsers = { data: undefined, isLoading: true, isError: false, error: null };
    renderDialog();
    expect(screen.getByText("Loading members…")).toBeInTheDocument();
    expect(screen.queryByText(/already in this channel/)).not.toBeInTheDocument();
  });

  it("shows the read error instead of an empty list", () => {
    mockUsers = { data: undefined, isLoading: false, isError: true, error: new Error("Directory unavailable") };
    renderDialog();
    expect(screen.getByRole("alert")).toHaveTextContent("Directory unavailable");
  });
});
