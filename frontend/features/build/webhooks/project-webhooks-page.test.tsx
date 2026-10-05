import { render, screen } from "@testing-library/react";
import {
  SAMPLE_WEBHOOK,
  st,
} from "./webhook-page-test-harness";
import { ProjectWebhooksPage } from "./project-webhooks-page";

describe("ProjectWebhooksPage — build:manage access control (BLD-X-FE-SETTINGS-WH-010)", () => {
  it("renders NoPermissionState when access is denied — page is gated on build:manage", () => {
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("shows the Add Webhook button when the viewer holds build:manage", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
  });

  it("hides the Add Webhook button when access is denied", () => {
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });

  it("fails closed on loading — Add Webhook does not appear while access is in flight", () => {
    st.accessState = "loading";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — loading state (BLD-X-FE-SETTINGS-WH-011)", () => {
  it("renders the loading skeleton while webhooks are being fetched", () => {
    st.accessState = "granted";
    st.isLoading = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("does not render webhook cards while loading", () => {
    st.accessState = "granted";
    st.isLoading = true;
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("webhook-card")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — error state (BLD-X-FE-SETTINGS-WH-012)", () => {
  it("renders error state when the webhooks fetch fails — not an empty list", () => {
    st.accessState = "granted";
    st.isError = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    expect(screen.queryByTestId("page-empty")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — empty state (BLD-X-FE-SETTINGS-WH-013)", () => {
  it("renders empty state when there are no webhooks", () => {
    st.accessState = "granted";
    st.webhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("page-empty")).toBeInTheDocument();
  });

  it("does not render webhook cards in the empty state", () => {
    st.accessState = "granted";
    st.webhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("webhook-card")).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — populated state (BLD-X-FE-SETTINGS-WH-014)", () => {
  it("renders a webhook card for each webhook when the list is non-empty", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK, { ...SAMPLE_WEBHOOK, id: 2, url: "https://other.com/hook" }];
    render(<ProjectWebhooksPage projectId="1" />);
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards).toHaveLength(2);
  });

  it("passes the webhook URL to the card — the page does not silently drop list items", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
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

  it("rejects zero and negative token values because the backend body requires a positive integer version", async () => {
    const { projectWebhookUpdateRequestContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );

    expect(projectWebhookUpdateRequestContract.safeParse({ version: 0, isActive: true }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: -1, isActive: true }).success).toBe(false);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 1, isActive: true }).success).toBe(true);
  });

  it("accepts url and events on update, including non-URL strings and empty arrays since the backend body does not apply url or min-length constraints, and rejects an undeclared key", async () => {
    const { projectWebhookUpdateRequestContract } = await import(
      "@/hooks/api/build/build-project-schema"
    );

    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, url: "https://ci.example.com/hook", events: ["ticket.created"] }).success).toBe(true);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, url: "not-a-url" }).success).toBe(true);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, events: [] }).success).toBe(true);
    expect(projectWebhookUpdateRequestContract.safeParse({ version: 2, secret: "rotate-me" }).success).toBe(false);
  });
});
