import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectWebhooksPage } from "./project-webhooks-page";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

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
});

const SAMPLE_WEBHOOK: ProjectWebhook = {
  id: 1,
  projectId: 5,
  url: "https://example.com/hook",
  events: ["ticket.created"],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
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
    const { projectWebhookListContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );
    const rawWithSecret = [
      {
        id: 1,
        orgId: "org-abc",
        projectId: 5,
        url: "https://example.com/hook",
        events: ["ticket.created"],
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        secret: "should-be-stripped-xxxx",
      },
    ];
    const parsed = projectWebhookListContract.parse(rawWithSecret);
    expect((parsed[0] as Record<string, unknown>)["secret"]).toBeUndefined();
  });

  it("projectWebhookListContract accepts a webhook with isActive true and false", async () => {
    const { projectWebhookListContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );
    const raw = [
      { id: 1, orgId: "o", projectId: 1, url: "https://a.com", events: [], isActive: true, createdAt: "2026-01-01T00:00:00Z" },
      { id: 2, orgId: "o", projectId: 1, url: "https://b.com", events: [], isActive: false, createdAt: "2026-01-01T00:00:00Z" },
    ];
    expect(() => projectWebhookListContract.parse(raw)).not.toThrow();
    expect(projectWebhookListContract.parse(raw)[1].isActive).toBe(false);
  });
});
