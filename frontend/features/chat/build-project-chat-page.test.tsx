import { render, screen } from "@testing-library/react";
import {
  baseChannelResult,
  mockMessagePanel,
  mockMessagePanelMounts,
  mockUseCan,
  mockUseChatOutboxDrain,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
} from "./build-project-chat-page-test-harness";
import { BuildProjectChatPage } from "./build-project-chat-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "ready" });
});

describe("BuildProjectChatPage — outbox", () => {
  it("drains the chat outbox, because this page has no chat suite to do it", () => {
    render(<BuildProjectChatPage projectId="1" />);
    expect(mockUseChatOutboxDrain).toHaveBeenCalled();
  });
});

describe("BuildProjectChatPage — loading state", () => {
  it("renders nothing while the channel query is loading so there is no flash of empty or denied state", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ isLoading: true }));
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("message-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("no-permission-state")).not.toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — channel not found (empty) state", () => {
  it("renders the empty state when the channel is not found so the user knows no channel is linked yet", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: null }));
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no chat channel/i)).toBeInTheDocument();
  });

  it("shows the create channel action in the empty state when the user has chat:channels:write", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: null }));
    mockUsePageState.mockReturnValue({ kind: "empty" });
    mockUseCan.mockReturnValue(true);
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByRole("button", { name: /create chat channel/i })).toBeInTheDocument();
  });

  it("hides the create action when the user lacks chat:channels:write so the empty state does not expose a control that will 403", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: null }));
    mockUsePageState.mockReturnValue({ kind: "empty" });
    mockUseCan.mockReturnValue(false);
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /create chat channel/i })).not.toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — error state", () => {
  it("renders the error state for non-404 errors so network failures show retry rather than an empty channel prompt", () => {
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ isError: true, error: new Error("Server error") }),
    );
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("Server error") });
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — permission-denied state", () => {
  it("renders the access-restricted view when chat:channels:read is denied, not the empty state, so a missing permission is not confused with a missing channel", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "chat:channels:read" });
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("no-permission-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("message-panel")).not.toBeInTheDocument();
  });

  it("does not claim denial while the access snapshot is loading, because useCan returns false during that window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.queryByTestId("no-permission-state")).not.toBeInTheDocument();
  });

  it("passes chat:channels:read, the key its channel read enforces, to usePageState", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "chat:channels:read" }),
    );
  });
});

describe("BuildProjectChatPage — ready state", () => {
  it("renders the MessagePanel when the channel is present and a session user is available", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1", name: "Project Chat" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("message-panel")).toBeInTheDocument();
  });

  it("passes the channelId to MessagePanel from the resolved channel so the wrong channel is not displayed", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-42", name: "Build Chat" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(mockMessagePanel).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "channel-42" }),
      undefined,
    );
  });

  it("passes the current user id to MessagePanel from the session so the message composer knows who is typing", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(mockMessagePanel).toHaveBeenCalledWith(
      expect.objectContaining({ currentUserId: "user-1" }),
      undefined,
    );
  });

  it("remounts the MessagePanel when the project's channel changes, so no composer or scroll state leaks between channels", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: { id: 1 } }));
    const { rerender } = render(<BuildProjectChatPage projectId="1" />);
    expect(mockMessagePanelMounts).toHaveBeenCalledTimes(1);
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: { id: 2 } }));
    rerender(<BuildProjectChatPage projectId="2" />);
    expect(mockMessagePanelMounts).toHaveBeenCalledTimes(2);
  });

  it("does not render the empty state or error state when the channel is present", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — useEntityChannel called with correct entity type and id", () => {
  it("calls useEntityChannel with type 'project' and the passed projectId string", () => {
    render(<BuildProjectChatPage projectId="99" />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("project", "99");
  });
});
