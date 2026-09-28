import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectWebhooksPage } from "./project-webhooks-page";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

interface BuildListKeyboardOptions {
  itemCount?: number;
  onOpen?: (index: number) => void;
  onEdit?: (index: number) => void;
  onCreate?: () => void;
  onClearSelection?: () => void;
  onShortcutHelp?: () => void;
  enabled?: boolean;
}

const mockUseBuildListKeyboard = jest.fn(
  (_options?: BuildListKeyboardOptions) => ({
    focusedIndex: null,
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
  useDeleteWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateWebhook: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

const mockUpdateMutate = jest.fn();
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
  }: {
    webhook: ProjectWebhook;
    onToggle?: (wh: Pick<ProjectWebhook, "id" | "version">, isActive: boolean) => void;
    onEdit?: (wh: ProjectWebhook) => void;
  }) => (
    <div data-testid="webhook-card" data-url={webhook.url}>
      <button onClick={() => onToggle?.({ id: webhook.id, version: webhook.version }, false)}>
        toggle-off
      </button>
      <button onClick={() => onEdit?.(webhook)}>edit-webhook</button>
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
  mockUpdateMutate.mockClear();
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

  it("the Sheet shows New Webhook title before any edit is triggered — the title is create-mode by default", () => {
    mockAccessState = "granted";
    mockWebhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /add webhook/i }));
    expect(screen.getByText("New Webhook")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — 409 conflict UX on toggle (BLD-X-FE-SETTINGS-WH-037)", () => {
  it("a 409 from updateWebhook shows a field-level conflict toast, not the generic error string", async () => {
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
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/conflict|active/i),
    );
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
