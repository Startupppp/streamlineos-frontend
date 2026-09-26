import { render, screen } from "@testing-library/react";
import { BuildProjectChatPage } from "./build-project-chat-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
  }: {
    children: React.ReactNode;
    noInternalScroll?: boolean;
  }) => <div>{children}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_PANEL_SOLID: "pm-panel-solid",
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
      {action ? <button type="button" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({
    title,
    description,
    onRetry,
  }: {
    title?: string;
    description?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-state">
      {title ? <span>{title}</span> : null}
      {description ? <span>{description}</span> : null}
      {onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockMessagePanel = jest.fn();
const mockChannelInfoPanel = jest.fn();

jest.mock("./message-panel", () => ({
  MessagePanel: (...args: unknown[]) => {
    mockMessagePanel(...args);
    return <div data-testid="message-panel" />;
  },
}));

jest.mock("./channel-info-panel", () => ({
  ChannelInfoPanel: (...args: unknown[]) => {
    mockChannelInfoPanel(...args);
    return <div data-testid="channel-info-panel" />;
  },
}));

jest.mock("./ably-provider", () => ({
  ChatAblyProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./use-chat-mobile", () => ({
  useIsChatPanelNarrow: () => false,
}));

const mockUseEntityChannel = jest.fn();
const mockUseCreateEntityChannel = jest.fn();
const mockUseCan = jest.fn();

jest.mock("@/hooks/api/chat", () => ({
  useEntityChannel: (...args: unknown[]) => mockUseEntityChannel(...args),
  useCreateEntityChannel: () => mockUseCreateEntityChannel(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/lib/api-client", () => ({
  isApiError: (e: unknown) =>
    e instanceof Error && "status" in e && typeof (e as { status: unknown }).status === "number",
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

function baseChannelResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("BuildProjectChatPage — loading state", () => {
  it("renders nothing while the channel query is loading so there is no flash of empty or denied state", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ isLoading: true }));
    const { container } = render(<BuildProjectChatPage projectId="1" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("BuildProjectChatPage — channel not found (empty) state", () => {
  it("renders the empty state when the channel query returns a 404 so the user knows no channel is linked yet", () => {
    const notFoundError = Object.assign(new Error("Not found"), { status: 404 });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ error: notFoundError, isError: true }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no chat channel/i)).toBeInTheDocument();
  });

  it("shows the create channel action in the empty state when the user has chat:channels:write", () => {
    const notFoundError = Object.assign(new Error("Not found"), { status: 404 });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ error: notFoundError, isError: true }),
    );
    mockUseCan.mockReturnValue(true);
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByRole("button", { name: /create chat channel/i })).toBeInTheDocument();
  });

  it("hides the create action when the user lacks chat:channels:write so the empty state does not expose a control that will 403", () => {
    const notFoundError = Object.assign(new Error("Not found"), { status: 404 });
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ error: notFoundError, isError: true }),
    );
    mockUseCan.mockReturnValue(false);
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /create chat channel/i })).not.toBeInTheDocument();
  });

  it("renders the empty state when query succeeds but returns no channel so a project without a linked channel shows the correct prompt", () => {
    mockUseEntityChannel.mockReturnValue(baseChannelResult({ data: null, isLoading: false }));
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — error state", () => {
  it("renders the error state for non-404 errors so network failures show retry rather than an empty channel prompt", () => {
    const serverError = Object.assign(new ApiError("Server error", 500, "SERVER_ERROR"), {});
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ error: serverError, isError: true }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

describe("BuildProjectChatPage — ready state", () => {
  it("renders the MessagePanel when the channel is present and a session user is available", () => {
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1", name: "Project Chat" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(screen.getByTestId("message-panel")).toBeInTheDocument();
  });

  it("passes the channelId to MessagePanel from the resolved channel so the wrong channel is not displayed", () => {
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
    mockUseEntityChannel.mockReturnValue(
      baseChannelResult({ data: { id: "channel-1" } }),
    );
    render(<BuildProjectChatPage projectId="1" />);
    expect(mockMessagePanel).toHaveBeenCalledWith(
      expect.objectContaining({ currentUserId: "user-1" }),
      undefined,
    );
  });

  it("does not render the empty state or error state when the channel is present", () => {
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
