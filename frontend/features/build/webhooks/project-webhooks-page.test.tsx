import { render, screen, act, fireEvent, waitFor, within } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectWebhooksPage } from "./project-webhooks-page";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

interface BuildListKeyboardOptions {
  itemCount?: number;
  searchInputRef?: { current: HTMLInputElement | null };
  onOpen?: (index: number) => void;
  onEdit?: (index: number) => void;
  onCreate?: () => void;
  onClearSelection?: () => void;
  onShortcutHelp?: () => void;
  enabled?: boolean;
}

let mockFocusedIndex: number | null = null;
const mockUseBuildListKeyboard = jest.fn(
  (_options?: BuildListKeyboardOptions) => ({
    focusedIndex: mockFocusedIndex,
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

let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/settings/integrations/webhooks",
  useSearchParams: () => mockSearchParams,
}));

let mockAccessState: AccessState = "denied";
let mockWebhooks: ProjectWebhook[] = [];
let mockIsLoading = false;
let mockIsError = false;
let mockHasMore = false;
let mockNextCursor: number | null = null;
const mockGoNext = jest.fn();
const mockGoPrevious = jest.fn();
let mockPagerCursor: string | undefined;
let mockPagerHasPrevious = false;
const mockUseBuildCursorPager = jest.fn((_resetKey?: string) => ({
  cursor: mockPagerCursor,
  hasPrevious: mockPagerHasPrevious,
  goNext: mockGoNext,
  goPrevious: mockGoPrevious,
  reset: jest.fn(),
}));

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  BUILD_CURSOR_STACK_PARAM: "cursors",
  useBuildCursorPager: (resetKey?: string) => mockUseBuildCursorPager(resetKey),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (_opts: unknown) => {
    if (mockAccessState === "denied") return { kind: "denied", permission: "build:manage" };
    if (mockAccessState === "loading") return { kind: "loading" };
    if (mockIsLoading) return { kind: "loading" };
    if (mockIsError) return { kind: "error", error: new Error("fetch failed") };
    if (!mockIsLoading && !mockIsError && mockWebhooks.length === 0) return { kind: "empty" };
    return { kind: "ready" };
  },
}));

const mockUseWebhooks = jest.fn(
  (_projectId: number, _filters?: Record<string, unknown>) => undefined,
);

jest.mock("@/hooks/api/build/webhooks", () => ({
  useWebhooks: (projectId: number, filters?: Record<string, unknown>) => {
    mockUseWebhooks(projectId, filters);
    return {
      data: { data: mockWebhooks, hasMore: mockHasMore, nextCursor: mockNextCursor },
      isLoading: mockIsLoading,
      isError: mockIsError,
      error: mockIsError ? new Error("fetch failed") : undefined,
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

const mockUpdateMutate = jest.fn();
const mockUpdateMutateAsync = jest.fn((_vars?: unknown) => Promise.resolve());
const mockDeleteMutateAsync = jest.fn((_webhookId?: unknown) => Promise.resolve());
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
  mockAccessState = "denied";
  mockWebhooks = [];
  mockIsLoading = false;
  mockIsError = false;
  mockHasMore = false;
  mockNextCursor = null;
  mockPagerCursor = undefined;
  mockPagerHasPrevious = false;
  mockGoNext.mockClear();
  mockGoPrevious.mockClear();
  mockUseWebhooks.mockClear();
  mockUseBuildCursorPager.mockClear();
  mockUseBuildListKeyboard.mockClear();
  mockFocusedIndex = null;
  mockUpdateMutate.mockClear();
  mockUpdateMutateAsync.mockClear();
  mockUpdateMutateAsync.mockImplementation((_vars?: unknown) => Promise.resolve());
  mockDeleteMutateAsync.mockClear();
  mockDeleteMutateAsync.mockImplementation((_webhookId?: unknown) => Promise.resolve());
  mockSearchParams = new URLSearchParams();
  (
    jest.requireMock("@/hooks/common/use-online-status") as {
      useOnlineStatus: jest.Mock;
    }
  ).useOnlineStatus.mockReturnValue(true);
});

const SAMPLE_WEBHOOK: ProjectWebhook = {
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

describe("ProjectWebhooksPage — build:manage access control (BLD-X-FE-SETTINGS-WH-010)", () => {
  it("renders NoPermissionState when access is denied — page is gated on build:manage", () => {
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("shows the Add Webhook button when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
  });

  it("hides the Add Webhook button when access is denied", () => {
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });

  it("fails closed on loading — Add Webhook does not appear while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — loading state (BLD-X-FE-SETTINGS-WH-011)", () => {
  it("renders the loading skeleton while webhooks are being fetched", () => {
    mockAccessState = "granted";
    mockIsLoading = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("does not render webhook cards while loading", () => {
    mockAccessState = "granted";
    mockIsLoading = true;
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("webhook-card")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — error state (BLD-X-FE-SETTINGS-WH-012)", () => {
  it("renders error state when the webhooks fetch fails — not an empty list", () => {
    mockAccessState = "granted";
    mockIsError = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    expect(screen.queryByTestId("page-empty")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — empty state (BLD-X-FE-SETTINGS-WH-013)", () => {
  it("renders empty state when there are no webhooks", () => {
    mockAccessState = "granted";
    mockWebhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-empty")).toBeInTheDocument();
  });

  it("does not render webhook cards in the empty state", () => {
    mockAccessState = "granted";
    mockWebhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("webhook-card")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — populated state (BLD-X-FE-SETTINGS-WH-014)", () => {
  it("renders a webhook card for each webhook when the list is non-empty", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK, { ...SAMPLE_WEBHOOK, id: 2, url: "https://other.com/hook" }];
    render(<ProjectWebhooksPage projectId="1" />);
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards).toHaveLength(2);
  });

  it("passes the webhook URL to the card — the page does not silently drop list items", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute(
      "data-url",
      SAMPLE_WEBHOOK.url,
    );
  });
});

describe("Webhook list contract — secret redaction (BLD-X-FE-SETTINGS-WH-015)", () => {
  it("projectWebhookSchema strips the secret field — it is never present in the list response", async () => {
    const { projectWebhookPageContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );
    const rawWithSecret = {
      data: [
        {
          id: 1,
          orgId: "org-abc",
          projectId: 5,
          url: "https://example.com/hook",
          events: ["ticket.created"],
          isActive: true,
          hasSecret: true,
          secretSetAt: "2026-01-01T00:00:00.000Z",
          version: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastDeliveryAt: null,
          lastDeliveryStatus: null,
          failureRate: null,
          secret: "should-be-stripped-xxxx",
        },
      ],
      hasMore: false,
      nextCursor: null,
    };
    const parsed = projectWebhookPageContract.parse(rawWithSecret);
    expect(parsed.data.length).toBeGreaterThan(0);
    expect((parsed.data[0] as Record<string, unknown>)["secret"]).toBeUndefined();
  });

  it("projectWebhookPageContract accepts a webhook with isActive true and false", async () => {
    const { projectWebhookPageContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );
    const raw = {
      data: [
        { id: 1, orgId: "o", projectId: 1, url: "https://a.com", events: [], isActive: true, hasSecret: true, secretSetAt: "2026-01-01T00:00:00Z", version: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", lastDeliveryAt: null, lastDeliveryStatus: null, failureRate: null },
        { id: 2, orgId: "o", projectId: 1, url: "https://b.com", events: [], isActive: false, hasSecret: false, secretSetAt: null, version: 4, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", lastDeliveryAt: null, lastDeliveryStatus: null, failureRate: null },
      ],
      hasMore: false,
      nextCursor: null,
    };
    expect(() => projectWebhookPageContract.parse(raw)).not.toThrow();
    expect(projectWebhookPageContract.parse(raw).data[1].isActive).toBe(false);
  });
});

describe("Webhook update request contract mirrors the backend strict body", () => {
  it("rejects an update with no concurrency token, because the backend body requires one and an omitted token is a 400 rather than a silent no-op", async () => {
    const { projectWebhookUpdateRequestContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );

    expect(projectWebhookUpdateRequestContract.safeParse({ isActive: false }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 3, isActive: false }).success).toBe(true);
  });

  it("rejects a zero or negative token, so a defaulted token cannot pass for a real one", async () => {
    const { projectWebhookUpdateRequestContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );

    expect(projectWebhookUpdateRequestContract.safeParse({ version: 0, isActive: true }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: -1, isActive: true }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 1, isActive: true }).success).toBe(true);
  });

  it("accepts url and events on update, which delete-and-recreate was the only route to before, and rejects an undeclared key", async () => {
    const { projectWebhookUpdateRequestContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );

    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, url: "https://ci.example.com/hook", events: ["ticket.created"] }).success).toBe(true);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, url: "not-a-url" }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, events: [] }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, secret: "rotate-me" }).success).toBe(false);
  });
});

describe("ProjectWebhooksPage — keyboard shortcut wiring (BLD-X-FE-SETTINGS-WH-030)", () => {
  it("wires useBuildListKeyboard with onCreate pointing to the Add Webhook action when the viewer can manage", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastArgs?.onCreate).toBe("function");
    expect(lastArgs?.itemCount).toBe(1);
  });

  it("does not wire onCreate when the viewer cannot manage — the c shortcut must fail closed", () => {
    mockAccessState = "denied";
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.onCreate).toBeUndefined();
  });

  it("enables keyboard shortcuts only when the page is in the ready state", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.enabled).toBe(true);
  });

  it("disables keyboard shortcuts while loading", () => {
    mockAccessState = "granted";
    mockIsLoading = true;
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.enabled).toBe(false);
  });
});

describe("ProjectWebhooksPage — shortcut help dialog (BLD-X-FE-SETTINGS-WH-031)", () => {
  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the dialog — calling it does not throw and transitions open state", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onShortcutHelp = mockUseBuildListKeyboard.mock.calls[0]?.[0]?.onShortcutHelp;
    expect(typeof onShortcutHelp).toBe("function");
    await act(async () => { onShortcutHelp?.(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — offline state (BLD-X-FE-SETTINGS-WH-032)", () => {
  it("hides the Add Webhook button when the user is offline — creation requires the server", () => {
    mockAccessState = "granted";
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });

  it("shows the Add Webhook button when online — paired with the offline assertion above so it cannot pass on a blank frame", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
  });

  it("shows You are offline in the empty state when the device is offline", () => {
    mockAccessState = "granted";
    mockWebhooks = [];
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByText("You are offline")).toBeInTheDocument();
  });

  it("does not show You are offline when the device is online and there are no webhooks", () => {
    mockAccessState = "granted";
    mockWebhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByText("You are offline")).not.toBeInTheDocument();
    expect(screen.getByText("No webhooks configured")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — URL-backed filters (BLD-X-FE-SETTINGS-WH-033)", () => {
  it("renders the state filter control — allowing the operator to view only active or inactive webhooks", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by state/i })).toBeInTheDocument();
  });

  it("renders the event filter control — paired with the state filter so the toolbar renders even with no webhooks", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by event/i })).toBeInTheDocument();
  });

  it("renders the URL search input — so the operator can search webhooks by URL prefix", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("textbox", { name: /search webhooks/i })).toBeInTheDocument();
  });

  it("renders all three filter controls on the same toolbar — all must be present before any filtering logic runs", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by state/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by event/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /search webhooks/i })).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — URL-backed cursor pagination (BLD-X-FE-SETTINGS-WH-034)", () => {
  it("resets the URL cursor stack whenever the filter shape changes so a shared link cannot pin a stale page", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseBuildCursorPager).toHaveBeenCalledWith("||||");
  });

  it("forwards the URL-backed cursor to useWebhooks as a number so page 2 is fetched server-side", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockPagerCursor = "41";
    mockPagerHasPrevious = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cursor: 41 }),
    );
  });

  it("sends no cursor to useWebhooks when the URL carries no cursor stack", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(1, undefined);
  });

  it("hides the pagination footer on a single page — there is no reveal button and no faked page count", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("shows prev/next controls once the server reports more rows — paired with the single-page assertion above", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockHasMore = true;
    mockNextCursor = 7;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeEnabled();
  });

  it("advances the URL cursor stack with the server nextCursor when Next page is pressed", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockHasMore = true;
    mockNextCursor = 7;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockGoNext).toHaveBeenCalledWith("7");
  });

  it("does not advance the cursor stack when the server reports no nextCursor", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockHasMore = true;
    mockNextCursor = null;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockGoNext).toHaveBeenCalledWith(undefined);
  });

  it("pops the URL cursor stack when Previous page is pressed", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockPagerCursor = "41";
    mockPagerHasPrevious = true;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(mockGoPrevious).toHaveBeenCalled();
  });
});

describe("ProjectWebhooksPage — from/to date filters (BLD-X-FE-SETTINGS-WH-035)", () => {
  it("renders the from date input so the operator can filter by creation start date", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByLabelText("Filter from date")).toBeInTheDocument();
  });

  it("renders the to date input — paired with from so both are always present", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByLabelText("Filter to date")).toBeInTheDocument();
  });

  it("forwards from and to to useWebhooks when the URL carries those params so the filter narrows results server-side", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    mockPagerCursor = undefined;
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-06-30");
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ from: "2026-01-01", to: "2026-06-30" }),
    );
  });

  it("includes from and to in the pager reset key so pagination resets when the date range changes", () => {
    mockAccessState = "granted";
    mockSearchParams = new URLSearchParams("from=2026-01-01");
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArg = mockUseBuildCursorPager.mock.calls.at(-1)?.[0] as string;
    expect(lastArg).toContain("2026-01-01");
  });
});

describe("ProjectWebhooksPage — edit Sheet (BLD-X-FE-SETTINGS-WH-036)", () => {
  it("opens the Sheet in edit mode when onEdit is called on a webhook card — title changes to Edit Webhook", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /edit-webhook/i }));
    await waitFor(() => {
      expect(screen.getByText("Edit Webhook")).toBeInTheDocument();
    });
  });

  it("submitting the edit form calls updateWebhook.mutate with url, events and version", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /edit-webhook/i }));
    await waitFor(() => screen.getByText("Edit Webhook"));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: SAMPLE_WEBHOOK.id,
          version: SAMPLE_WEBHOOK.version,
          url: SAMPLE_WEBHOOK.url,
          events: SAMPLE_WEBHOOK.events,
        }),
        expect.any(Object),
      );
    });
  });

  it("wires onEdit into the keyboard hook so the e shortcut has a target now that update accepts url and events", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastArgs?.onEdit).toBe("function");
  });

  it("does not wire onEdit when the viewer cannot manage — the e shortcut must fail closed", () => {
    mockAccessState = "denied";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.onEdit).toBeUndefined();
  });

  it("the onEdit callback the keyboard hook receives opens the Sheet in edit mode for the focused row", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onEdit = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onEdit;
    await act(async () => { onEdit?.(0); });
    expect(screen.getByText("Edit Webhook")).toBeInTheDocument();
  });

  it("an out-of-range focused index does not open the Sheet, so a stale focus after a page change cannot edit the wrong row", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onEdit = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onEdit;
    await act(async () => { onEdit?.(9); });
    expect(screen.queryByText("Edit Webhook")).not.toBeInTheDocument();
  });

  it("the Sheet shows New Webhook title before any edit is triggered — the title is create-mode by default", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /add webhook/i }));
    expect(screen.getByText("New Webhook")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — 409 conflict UX on toggle (BLD-X-FE-SETTINGS-WH-037)", () => {
  it("a 409 from updateWebhook opens the conflict overlay comparing the server value with the submitted one, instead of only a toast", async () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 5 } });
    });
    expect(
      screen.getByText("This webhook changed while you were editing"),
    ).toBeInTheDocument();
    expect(screen.getByText("On the server now")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("Keep my changes resubmits the patch with the server's current version, so the retry cannot collide on the stale token", async () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: true, version: 9 }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 9 } });
    });
    mockUpdateMutate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /keep my changes/i }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookId: SAMPLE_WEBHOOK.id,
        version: 9,
        isActive: false,
      }),
      expect.any(Object),
    );
  });

  it("Discard my changes closes the conflict overlay without issuing another write", async () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 5 } });
    });
    mockUpdateMutate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /discard my changes/i }));
    await waitFor(() => {
      expect(
        screen.queryByText("This webhook changed while you were editing"),
      ).not.toBeInTheDocument();
    });
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("the conflict overlay is absent before any 409 — paired with the open assertion so it cannot pass on a blank frame", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByText("This webhook changed while you were editing"),
    ).not.toBeInTheDocument();
  });

  it("a non-409 error from updateWebhook shows the plain toast — the 409 branch does not swallow other errors", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    act(() => {
      options.onError?.(new Error("network error"));
    });
    expect(toast.error).toHaveBeenCalledWith(expect.not.stringMatching(/conflict/i));
  });
});

describe("ProjectWebhooksPage — bulk actions (BLD-X-FE-SETTINGS-WH-038)", () => {
  function selectFirstWebhook() {
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
  }

  it("shows no bulk action bar until a row is selected — the primary record itself is never selected", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the bulk action bar with the selected count once a row is selected", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(
      screen.getByRole("region", { name: /webhook bulk actions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("does not offer row selection when the viewer cannot manage — bulk writes fail closed", () => {
    mockAccessState = "denied";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: "select-1" })).not.toBeInTheDocument();
  });

  it("offers Disable but not Enable when every selected row is already active — the transition must be valid for all of them", () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled();
  });

  it("offers Enable but not Disable when every selected row is inactive", () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: false }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(screen.getByRole("button", { name: "Enable" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Disable" })).toBeDisabled();
  });

  it("offers neither Enable nor Disable on a mixed selection, because one request would be a no-op for half the rows", () => {
    mockAccessState = "granted";
    mockWebhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: false },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disable" })).toBeDisabled();
  });

  it("bulk Disable sends one update per selected row carrying that row's own version token", async () => {
    mockAccessState = "granted";
    mockWebhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true, version: 3 },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: true, version: 7 },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ webhookId: 1, version: 3, isActive: false });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ webhookId: 2, version: 7, isActive: false });
  });

  it("reports the whole-batch result when every row succeeds", async () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock } };
    expect(toast.success).toHaveBeenCalledWith("1 webhook disabled");
  });

  it("names the rows that failed on a partial success, rather than reporting the batch as done", async () => {
    mockAccessState = "granted";
    mockWebhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true, version: 1 },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: true, version: 1 },
    ];
    mockUpdateMutateAsync.mockImplementation((vars?: unknown) => {
      const webhookId = (vars as { webhookId: number }).webhookId;
      return webhookId === 2 ? Promise.reject(new Error("boom")) : Promise.resolve();
    });
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    expect(toast.error).toHaveBeenCalledWith(
      "1 of 2 disabled. Failed: https://b.example.com",
    );
  });

  it("bulk delete confirms first and then deletes every selected row", async () => {
    mockAccessState = "granted";
    mockWebhooks = [{ ...SAMPLE_WEBHOOK, id: 1 }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    fireEvent.click(
      within(screen.getByRole("region", { name: /webhook bulk actions/i })).getByRole(
        "button",
        { name: "Delete" },
      ),
    );
    const dialog = await screen.findByRole("alertdialog");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    });
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith(1);
  });

  it("clearing the selection removes the bulk bar", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("changing a filter drops the selection, so a bulk action cannot apply to rows that scrolled out of the filtered set", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    fireEvent.change(screen.getByLabelText("Filter from date"), {
      target: { value: "2026-02-01" },
    });
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("Esc clears the selection through the shared list keyboard hook", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    const onClearSelection =
      mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onClearSelection;
    act(() => {
      onClearSelection?.();
    });
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — density toggle (BLD-X-FE-SETTINGS-WH-039)", () => {
  it("starts compact, as the page contract requires compact by default", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-density", "compact");
  });

  it("switches the rows to comfortable density when the toggle is pressed", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(screen.getByTestId("webhook-card")).toHaveAttribute(
      "data-density",
      "comfortable",
    );
  });

  it("switches back to compact on a second press, so the toggle is reversible", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    fireEvent.click(screen.getByRole("button", { name: "Comfortable" }));
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-density", "compact");
  });
});

describe("ProjectWebhooksPage — j/k focus, Enter and / (BLD-X-FE-SETTINGS-WH-042)", () => {
  it("hands the search input to the keyboard hook, so / focuses a real element rather than nothing", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.searchInputRef?.current).toBe(
      screen.getByRole("textbox", { name: /search webhooks/i }),
    );
  });

  it("marks the j/k focused row as focused, so the moving cursor is visible on the list", () => {
    mockAccessState = "granted";
    mockWebhooks = [
      SAMPLE_WEBHOOK,
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com" },
    ];
    mockFocusedIndex = 1;
    render(<ProjectWebhooksPage projectId="1" />);
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards[0]).toHaveAttribute("data-focused", "false");
    expect(cards[1]).toHaveAttribute("data-focused", "true");
  });

  it("marks no row focused when the cursor has not moved — paired with the focused assertion above", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-focused", "false");
  });

  it("Enter on the focused row opens its delivery history, so the shortcut has a real target", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "true");
  });

  it("Enter on an already open row closes it again, so the shortcut is reversible", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    await act(async () => {
      onOpen?.(0);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
  });

  it("Enter with an out-of-range focus opens nothing, so a stale cursor cannot expand the wrong row", async () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(9);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
  });

  it("only one row is open at a time, so the expanded panel follows the cursor", async () => {
    mockAccessState = "granted";
    mockWebhooks = [
      SAMPLE_WEBHOOK,
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com" },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    await act(async () => {
      onOpen?.(1);
    });
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards[0]).toHaveAttribute("data-expanded", "false");
    expect(cards[1]).toHaveAttribute("data-expanded", "true");
  });
});
