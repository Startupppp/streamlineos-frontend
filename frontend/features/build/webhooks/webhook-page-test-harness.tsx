import type { AccessState } from "@/lib/rbac/gate";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

export interface BuildListKeyboardOptions {
  itemCount?: number;
  searchInputRef?: { current: HTMLInputElement | null };
  onOpen?: (index: number) => void;
  onEdit?: (index: number) => void;
  onCreate?: () => void;
  onClearSelection?: () => void;
  onShortcutHelp?: () => void;
  enabled?: boolean;
}

export interface WebhookPageMockState {
  accessState: AccessState;
  webhooks: ProjectWebhook[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  nextCursor: number | null;
  pagerCursor: string | undefined;
  pagerHasPrevious: boolean;
  searchParams: URLSearchParams;
  focusedIndex: number | null;
}

export const st: WebhookPageMockState = {
  accessState: "denied",
  webhooks: [],
  isLoading: false,
  isError: false,
  hasMore: false,
  nextCursor: null,
  pagerCursor: undefined,
  pagerHasPrevious: false,
  searchParams: new URLSearchParams(),
  focusedIndex: null,
};


export const mockUseBuildListKeyboard = jest.fn(
  (_options?: BuildListKeyboardOptions) => ({
    focusedIndex: st.focusedIndex,
    setFocusedIndex: jest.fn(),
  }),
);
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (options: BuildListKeyboardOptions) =>
    mockUseBuildListKeyboard(options),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/settings/integrations/webhooks",
  useSearchParams: () => st.searchParams,
}));

export const mockGoNext = jest.fn();
export const mockGoPrevious = jest.fn();
export const mockUseBuildCursorPager = jest.fn((_resetKey?: string) => ({
  cursor: st.pagerCursor,
  hasPrevious: st.pagerHasPrevious,
  goNext: mockGoNext,
  goPrevious: mockGoPrevious,
  reset: jest.fn(),
}));

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  BUILD_CURSOR_STACK_PARAM: "cursors",
  useBuildCursorPager: (resetKey?: string) => mockUseBuildCursorPager(resetKey),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => st.accessState === "granted",
  useCanState: (_permission: string): AccessState => st.accessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (_opts: unknown) => {
    if (st.accessState === "denied") return { kind: "denied", permission: "build:manage" };
    if (st.accessState === "loading") return { kind: "loading" };
    if (st.isLoading) return { kind: "loading" };
    if (st.isError) return { kind: "error", error: new Error("fetch failed") };
    if (!st.isLoading && !st.isError && st.webhooks.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  },
}));

export const mockUseWebhooks = jest.fn(
  (_projectId: number, _filters?: Record<string, unknown>) => undefined,
);

jest.mock("@/hooks/api/build/webhooks", () => ({
  useWebhooks: (projectId: number, filters?: Record<string, unknown>) => {
    mockUseWebhooks(projectId, filters);
    return {
      data: { data: st.webhooks, hasMore: st.hasMore, nextCursor: st.nextCursor },
      isLoading: st.isLoading,
      isError: st.isError,
      error: st.isError ? new Error("fetch failed") : undefined,
      refetch: jest.fn(),
    };
  },
  useCreateWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWebhook: () => ({
    mutate: jest.fn(),
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
  useUpdateWebhook: () => ({
    mutate: mockUpdateMutate,
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

export const mockUpdateMutate = jest.fn();
export const mockUpdateMutateAsync = jest.fn((_vars?: unknown) => Promise.resolve());
export const mockDeleteMutateAsync = jest.fn((_webhookId?: unknown) => Promise.resolve());
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/api-envelope", () => ({
  isApiError: (e: unknown): e is { status: number; details?: unknown } =>
    typeof e === "object" && e !== null && "status" in e,
}));

jest.mock("@/features/build/settings/webhook-card", () => ({
  WebhookCard: ({
    webhook,
    onToggle,
    onEdit,
    density,
    selected,
    onSelectedChange,
    focused,
    expanded,
    onExpandedChange,
  }: {
    webhook: ProjectWebhook;
    onToggle?: (wh: Pick<ProjectWebhook, "id" | "version">, isActive: boolean) => void;
    onEdit?: (wh: ProjectWebhook) => void;
    density?: string;
    selected?: boolean;
    onSelectedChange?: (webhookId: number, selected: boolean) => void;
    focused?: boolean;
    expanded?: boolean;
    onExpandedChange?: (webhookId: number, expanded: boolean) => void;
  }) => (
    <div
      data-testid="webhook-card"
      data-url={webhook.url}
      data-density={density}
      data-selected={selected === true ? "true" : "false"}
      data-selectable={onSelectedChange === undefined ? "false" : "true"}
      data-focused={focused === true ? "true" : "false"}
      data-expanded={expanded === true ? "true" : "false"}
    >
      <button onClick={() => onExpandedChange?.(webhook.id, expanded !== true)}>
        {`expand-${webhook.id}`}
      </button>
      <button onClick={() => onToggle?.({ id: webhook.id, version: webhook.version }, false)}>
        toggle-off
      </button>
      <button onClick={() => onEdit?.(webhook)}>edit-webhook</button>
      <button onClick={() => onSelectedChange?.(webhook.id, selected !== true)}>
        {`select-${webhook.id}`}
      </button>
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
    empty,
  }: {
    resolution: { kind: string };
    children: React.ReactNode;
    loading: React.ReactNode;
    empty?: React.ReactNode;
  }) => {
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    if (resolution.kind === "empty") return <div data-testid="page-empty">{empty}</div>;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

beforeEach(() => {
  st.accessState = "denied";
  st.webhooks = [];
  st.isLoading = false;
  st.isError = false;
  st.hasMore = false;
  st.nextCursor = null;
  st.pagerCursor = undefined;
  st.pagerHasPrevious = false;
  mockGoNext.mockClear();
  mockGoPrevious.mockClear();
  mockUseWebhooks.mockClear();
  mockUseBuildCursorPager.mockClear();
  mockUseBuildListKeyboard.mockClear();
  st.focusedIndex = null;
  mockUpdateMutate.mockClear();
  mockUpdateMutateAsync.mockClear();
  mockUpdateMutateAsync.mockImplementation((_vars?: unknown) => Promise.resolve());
  mockDeleteMutateAsync.mockClear();
  mockDeleteMutateAsync.mockImplementation((_webhookId?: unknown) => Promise.resolve());
  st.searchParams = new URLSearchParams();
  (
    jest.requireMock("@/hooks/common/use-online-status") as {
      useOnlineStatus: jest.Mock;
    }
  ).useOnlineStatus.mockReturnValue(true);
});

export const SAMPLE_WEBHOOK: ProjectWebhook = {
  id: 1,
  orgId: "org-1",
  projectId: 5,
  url: "https://example.com/hook",
  events: ["ticket.created"],
  isActive: true,
  hasSecret: false,
  secretSetAt: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastDeliveryAt: null,
  lastDeliveryStatus: null,
  failureRate: null,
};
