import { render, screen, act } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectWebhooksPage } from "./project-webhooks-page";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

const mockUseBuildListKeyboard = jest.fn(() => ({
  focusedIndex: null,
  setFocusedIndex: jest.fn(),
}));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
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
  useSearchParams: () => new URLSearchParams(),
}));

let mockAccessState: AccessState = "denied";
let mockWebhooks: ProjectWebhook[] = [];
let mockIsLoading = false;
let mockIsError = false;

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

jest.mock("@/hooks/api/build/webhooks", () => ({
  useWebhooks: () => ({
    data: mockWebhooks,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockIsError ? new Error("fetch failed") : undefined,
    refetch: jest.fn(),
  }),
  useCreateWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateWebhook: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("@/features/build/settings/webhook-card", () => ({
  WebhookCard: ({ webhook }: { webhook: ProjectWebhook }) => (
    <div data-testid="webhook-card" data-url={webhook.url} />
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  PM_FILL_PANEL: "",
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
  mockUseBuildListKeyboard.mockClear();
  (
    jest.requireMock("@/hooks/common/use-online-status") as {
      useOnlineStatus: jest.Mock;
    }
  ).useOnlineStatus.mockReturnValue(true);
});

const SAMPLE_WEBHOOK: ProjectWebhook = {
  id: 1,
  projectId: 5,
  url: "https://example.com/hook",
  events: ["ticket.created"],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
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
          createdAt: "2026-01-01T00:00:00.000Z",
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
        { id: 1, orgId: "o", projectId: 1, url: "https://a.com", events: [], isActive: true, createdAt: "2026-01-01T00:00:00Z", lastDeliveryAt: null, lastDeliveryStatus: null, failureRate: null },
        { id: 2, orgId: "o", projectId: 1, url: "https://b.com", events: [], isActive: false, createdAt: "2026-01-01T00:00:00Z", lastDeliveryAt: null, lastDeliveryStatus: null, failureRate: null },
      ],
      hasMore: false,
      nextCursor: null,
    };
    expect(() => projectWebhookPageContract.parse(raw)).not.toThrow();
    expect(projectWebhookPageContract.parse(raw).data[1].isActive).toBe(false);
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
    const capturedOptions = mockUseBuildListKeyboard.mock.calls[0]?.[0] as { onShortcutHelp: () => void };
    expect(typeof capturedOptions.onShortcutHelp).toBe("function");
    await act(async () => { capturedOptions.onShortcutHelp(); });
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
