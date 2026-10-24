import React, { createRef } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagePanelView } from "./message-panel-view";

const mockNarrow = jest.fn(() => false);

jest.mock("./use-chat-mobile", () => ({
  useIsChatPanelNarrow: () => mockNarrow(),
}));

jest.mock("next/dynamic", () => () => {
  function DynamicStub() {
    return null;
  }
  return DynamicStub;
});

jest.mock("./message-list", () => ({ MessageList: () => <div>message list</div> }));
jest.mock("./message-input", () => ({
  MessageInput: () => <textarea data-chat-composer aria-label="Message composer" />,
}));
jest.mock("./message-panel-side-panels", () => ({ MessagePanelSidePanels: () => null }));
jest.mock("./channel-avatar", () => ({ ChannelAvatar: () => null }));

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));

type ViewProps = React.ComponentProps<typeof MessagePanelView>;

function makeProps(overrides: Partial<ViewProps["header"]> = {}): ViewProps {
  const run = jest.fn().mockResolvedValue({ text: "Three decisions were made." });
  return {
    header: {
      onBack: jest.fn(),
      displayName: "launch",
      channel: undefined,
      otherMember: null,
      isOtherOnline: false,
      memberCount: 4,
      activeHuddle: null,
      isInHuddle: false,
      onHuddle: jest.fn(),
      huddleStartPending: false,
      huddleJoinPending: false,
      canUseAi: true,
      summarizeAction: { key: "summarize", label: "Summarize conversation", run },
      onToggleSaved: jest.fn(),
      onToggleInfo: jest.fn(),
      showInfoPanel: false,
      ...overrides,
    },
    workspace: {
      messageList: {} as ViewProps["workspace"]["messageList"],
      messageInput: { channelId: 9 } as ViewProps["workspace"]["messageInput"],
      viewerIsMember: true,
    },
    thread: { messageId: null, channelId: 9, currentUserId: "user-1", onClose: jest.fn() },
    sidePanels: {
      isPanelNarrow: false,
      showSavedPanel: false,
      setShowSavedPanel: jest.fn(),
      forwardMessage: null,
      setForwardMessage: jest.fn(),
      dropdownTriggerRef: createRef<HTMLButtonElement>(),
    },
    isOnline: true,
    isReconnecting: false,
  };
}

async function openOverflow(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("button", { name: "More conversation actions" }).focus();
  await user.keyboard("{Enter}");
  return screen.findByRole("menu");
}

beforeEach(() => {
  mockNarrow.mockReturnValue(false);
});

describe("MessagePanelView header — overflow owns details and secondary actions", () => {
  it("shows a single overflow instead of a button per panel", () => {
    render(<MessagePanelView {...makeProps()} />);
    expect(screen.queryByRole("button", { name: "Conversation details" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "More conversation actions" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Shared files" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Saved messages" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle member info" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^AI/ })).toBeNull();
  });

  it("opens the details surface from the overflow menu", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const menu = await openOverflow(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Conversation details" }));
    expect(props.header.onToggleInfo).toHaveBeenCalledTimes(1);
  });

  it("puts details, saved messages and the AI summary in the overflow menu", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const menu = await openOverflow(user);
    expect(within(menu).getByRole("menuitem", { name: "Conversation details" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Saved messages" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Summarize conversation" })).toBeInTheDocument();
    await user.click(within(menu).getByRole("menuitem", { name: "Saved messages" }));
    expect(props.header.onToggleSaved).toHaveBeenCalledTimes(1);
  });

  it("runs the summary from the overflow and shows the result", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const menu = await openOverflow(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Summarize conversation" }));
    await waitFor(() => expect(props.header.summarizeAction.run).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Three decisions were made.")).toBeInTheDocument();
  });

  it("explains why the summary is unavailable instead of failing silently", async () => {
    const user = userEvent.setup();
    const run = jest.fn();
    render(
      <MessagePanelView
        {...makeProps({
          summarizeAction: {
            key: "summarize",
            label: "Summarize conversation",
            run,
            disabledReason: "AI credits are used up for this month",
          },
        })}
      />,
    );
    const menu = await openOverflow(user);
    const item = within(menu).getByRole("menuitem", { name: /Summarize conversation/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(within(item).getByText("AI credits are used up for this month")).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
  });

  it("offers no summary to a user without AI access", async () => {
    const user = userEvent.setup();
    render(<MessagePanelView {...makeProps({ canUseAi: false })} />);
    const menu = await openOverflow(user);
    expect(within(menu).queryByRole("menuitem", { name: "Summarize conversation" })).toBeNull();
  });

  it("keeps details inside the overflow on a narrow panel", async () => {
    mockNarrow.mockReturnValue(true);
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const toolbar = screen.getByRole("toolbar", { name: "Conversation actions" });
    expect(within(toolbar).queryByRole("button", { name: "Conversation details" })).toBeNull();
    expect(within(toolbar).getByRole("button", { name: "More conversation actions" })).toBeInTheDocument();
    expect(within(toolbar).queryByRole("button", { name: /^AI/ })).toBeNull();
    const menu = await openOverflow(user);
    await user.click(within(menu).getByRole("menuitem", { name: "Conversation details" }));
    expect(props.header.onToggleInfo).toHaveBeenCalledTimes(1);
  });
});

describe("MessagePanelView header search", () => {
  it.each([false, true])("opens the single chat search via chat:open-search (narrow=%s)", async (narrow) => {
    mockNarrow.mockReturnValue(narrow);
    const user = userEvent.setup();
    const opened = jest.fn();
    window.addEventListener("chat:open-search", opened);
    render(<MessagePanelView {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "Search messages, channels and people" }));
    window.removeEventListener("chat:open-search", opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});

describe("MessagePanelView header huddle button is provider aware", () => {
  const joined = {
    id: 3,
    channelId: 9,
    status: "active" as const,
    calendarEventId: null,
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    startedAt: "2026-09-02T12:00:00.000Z",
    endedAt: null,
    startedBy: "u1",
    startedByUser: { id: "u1", name: "Ada" },
    participants: [
      { id: 1, huddleId: 3, joinedAt: "2026-09-02T12:00:00.000Z", leftAt: null, userId: "u1", user: null },
      { id: 2, huddleId: 3, joinedAt: "2026-09-02T12:00:00.000Z", leftAt: null, userId: "u2", user: null },
    ],
  };

  it.each([
    ["google_meet" as const, "Join Google Meet"],
    ["microsoft_teams" as const, "Join Microsoft Teams"],
    [null, "Join external meeting"],
  ])("labels the %s huddle button %s and keeps the joined count in its accessible name", (meetingProvider, label) => {
    render(<MessagePanelView {...makeProps({ activeHuddle: { ...joined, meetingProvider } })} />);
    const button = screen.getByRole("button", { name: `${label}, 2 joined through StreamlineOS` });
    expect(button).toHaveTextContent(`${label} (2)`);
  });

  it("keeps Start huddle when nothing is active", () => {
    render(<MessagePanelView {...makeProps()} />);
    expect(screen.getByRole("button", { name: "Start huddle" })).toBeInTheDocument();
  });
});

describe("MessagePanelView skip link", () => {
  it("is the first tab stop and moves focus to the composer", async () => {
    const user = userEvent.setup();
    render(<MessagePanelView {...makeProps()} />);
    await user.tab();
    const skip = screen.getByRole("button", { name: "Skip to message composer" });
    expect(skip).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Message composer" })).toHaveFocus();
  });
});
