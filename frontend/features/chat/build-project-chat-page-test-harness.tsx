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

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

export const mockMessagePanel = jest.fn();
export const mockMessagePanelMounts = jest.fn();
const mockChannelInfoPanel = jest.fn();

jest.mock("./message-panel", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    MessagePanel: (...args: unknown[]) => {
      mockMessagePanel(...args);
      useEffect(() => {
        mockMessagePanelMounts();
      }, []);
      return <div data-testid="message-panel" />;
    },
  };
});

jest.mock("./channel-info-panel", () => ({
  ChannelInfoPanel: (...args: unknown[]) => {
    mockChannelInfoPanel(...args);
    return <div data-testid="channel-info-panel" />;
  },
}));

jest.mock("./ably-provider", () => ({
  ChatAblyProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

export const mockUseChatOutboxDrain = jest.fn();

jest.mock("./use-chat-offline-queue", () => ({
  useChatOutboxDrain: () => mockUseChatOutboxDrain(),
}));

jest.mock("./use-chat-mobile", () => ({
  useIsChatPanelNarrow: () => false,
}));

export const mockUseEntityChannel = jest.fn();
export const mockUseCreateEntityChannel = jest.fn();
export const mockUseCan = jest.fn();

jest.mock("@/hooks/api/chat-personal-b", () => ({
  useEntityChannel: (...args: unknown[]) => mockUseEntityChannel(...args),
  useCreateEntityChannel: () => mockUseCreateEntityChannel(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

export const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
    onRetry,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children?: React.ReactNode;
    onRetry?: () => void;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div role="status" data-testid="no-permission-state">Access Restricted</div>;
    if (resolution.kind === "error")
      return (
        <div data-testid="error-state">
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      );
    return <>{children}</>;
  },
}));

export function baseChannelResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}
