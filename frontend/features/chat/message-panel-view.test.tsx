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
jest.mock("./message-input", () => ({ MessageInput: () => <div>message input</div> }));
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
      messageInput: {} as ViewProps["workspace"]["messageInput"],
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

describe("MessagePanelView header — one details entry plus one overflow", () => {
  it("shows a single Details button and a single overflow instead of a button per panel", () => {
    render(<MessagePanelView {...makeProps()} />);
    expect(screen.getAllByRole("button", { name: "Conversation details" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "More conversation actions" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Shared files" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Saved messages" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle member info" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^AI/ })).toBeNull();
  });

  it("opens the details surface from the Details button", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const details = screen.getByRole("button", { name: "Conversation details" });
    expect(details).toHaveAttribute("aria-expanded", "false");
    await user.click(details);
    expect(props.header.onToggleInfo).toHaveBeenCalledTimes(1);
  });

  it("puts saved messages and the AI summary in the overflow menu", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessagePanelView {...props} />);
    const menu = await openOverflow(user);
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

  it("offers no summary to a user without AI access", async () => {
    const user = userEvent.setup();
    render(<MessagePanelView {...makeProps({ canUseAi: false })} />);
    const menu = await openOverflow(user);
    expect(within(menu).queryByRole("menuitem", { name: "Summarize conversation" })).toBeNull();
  });

  it("keeps the same details entry and overflow on a narrow panel", () => {
    mockNarrow.mockReturnValue(true);
    render(<MessagePanelView {...makeProps()} />);
    const toolbar = screen.getByRole("toolbar", { name: "Conversation actions" });
    expect(within(toolbar).getByRole("button", { name: "Conversation details" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "More conversation actions" })).toBeInTheDocument();
    expect(within(toolbar).queryByRole("button", { name: /^AI/ })).toBeNull();
  });
});
