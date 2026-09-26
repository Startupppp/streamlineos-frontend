import {
  projectWebhookListContract,
  projectWebhookRowContract,
  webhookDeliveryListContract,
} from "./build-project-schema";

const BASE_WEBHOOK_ITEM = {
  id: 1,
  orgId: "org-abc",
  projectId: 5,
  url: "https://example.com/webhook",
  events: ["ticket.created", "ticket.updated"],
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  lastDeliveryAt: null,
  lastDeliveryStatus: null,
  failureRate: null,
};

function makePage(items: unknown[]) {
  return { data: items, hasMore: false, nextCursor: null };
}

describe("projectWebhookListContract (BLD-X-BE-SETTINGS-WH-001)", () => {
  it("accepts a valid webhook page — paired with the missing-url rejection test", () => {
    expect(() => projectWebhookListContract.parse(makePage([BASE_WEBHOOK_ITEM]))).not.toThrow();
  });

  it("rejects a webhook missing url — the core field that identifies the endpoint", () => {
    const itemWithoutUrl = { ...BASE_WEBHOOK_ITEM };
    delete (itemWithoutUrl as Record<string, unknown>)["url"];
    expect(() => projectWebhookListContract.parse(makePage([itemWithoutUrl]))).toThrow();
  });

  it("accepts an empty events array — a webhook with no subscriptions is valid", () => {
    const raw = makePage([{ ...BASE_WEBHOOK_ITEM, id: 2, events: [], isActive: false }]);
    expect(() => projectWebhookListContract.parse(raw)).not.toThrow();
  });

  it("parses hasMore and nextCursor — so the frontend can request the next page", () => {
    const raw = { data: [BASE_WEBHOOK_ITEM], hasMore: true, nextCursor: 42 };
    const parsed = projectWebhookListContract.parse(raw);
    expect(parsed.hasMore).toBe(true);
    expect(parsed.nextCursor).toBe(42);
  });

  it("accepts lastDeliveryAt as a date string — so the card face can show last delivery", () => {
    const raw = makePage([{ ...BASE_WEBHOOK_ITEM, lastDeliveryAt: "2026-09-01T00:00:00.000Z", lastDeliveryStatus: "success", failureRate: 0 }]);
    const parsed = projectWebhookListContract.parse(raw);
    expect(parsed.data[0].lastDeliveryAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("accepts failureRate as a float — paired with the null test so the field cannot be missing", () => {
    const raw = makePage([{ ...BASE_WEBHOOK_ITEM, lastDeliveryAt: "2026-09-01T00:00:00.000Z", lastDeliveryStatus: "failed", failureRate: 0.33 }]);
    const parsed = projectWebhookListContract.parse(raw);
    expect(parsed.data[0].failureRate).toBeCloseTo(0.33);
  });

  it("accepts failureRate null when no deliveries exist — paired with float test above", () => {
    const raw = makePage([BASE_WEBHOOK_ITEM]);
    const parsed = projectWebhookListContract.parse(raw);
    expect(parsed.data[0].failureRate).toBeNull();
  });

  it("rejects lastDeliveryStatus outside the allowed enum values — z.string() would silently accept 'timeout'", () => {
    const raw = makePage([{ ...BASE_WEBHOOK_ITEM, lastDeliveryAt: "2026-09-01T00:00:00.000Z", lastDeliveryStatus: "timeout", failureRate: null }]);
    expect(() => projectWebhookListContract.parse(raw)).toThrow();
  });
});

describe("webhookDeliveryListContract (BLD-X-BE-SETTINGS-WH-002)", () => {
  it("accepts valid delivery records with null lastError", () => {
    const raw = [
      {
        id: 10,
        webhookId: 1,
        event: "ticket.created",
        status: "success",
        responseCode: 200,
        attempts: 1,
        lastError: null,
        deliveredAt: "2024-06-01T12:00:00.000Z",
      },
    ];
    expect(() => webhookDeliveryListContract.parse(raw)).not.toThrow();
  });

  it("rejects a delivery with an unknown status — z.string() over an enum would silently accept 'timeout'", () => {
    const raw = [
      {
        id: 11,
        webhookId: 1,
        event: "ticket.updated",
        status: "timeout",
        responseCode: null,
        attempts: 3,
        lastError: "Read timeout",
        deliveredAt: "2024-06-01T12:05:00.000Z",
      },
    ];
    expect(() => webhookDeliveryListContract.parse(raw)).toThrow();
  });

  it("accepts null responseCode for failed deliveries where no HTTP response was received", () => {
    const raw = [
      {
        id: 12,
        webhookId: 1,
        event: "sprint.started",
        status: "failed",
        responseCode: null,
        attempts: 2,
        lastError: "Connection refused",
        deliveredAt: "2024-06-01T12:10:00.000Z",
      },
    ];
    expect(() => webhookDeliveryListContract.parse(raw)).not.toThrow();
  });
});

describe("projectWebhookRowContract (BLD-X-BE-SETTINGS-WH-003)", () => {
  it("accepts a single webhook row — paired with the missing-field test to prevent a vacuous positive", () => {
    const raw = {
      id: 1,
      orgId: "org-abc",
      projectId: 5,
      url: "https://example.com/hook",
      events: ["member.added"],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      failureRate: null,
    };
    const result = projectWebhookRowContract.parse(raw);
    expect(result.url).toBe("https://example.com/hook");
  });

  it("rejects a webhook row missing isActive — the toggle update path must return a typed boolean", () => {
    const raw = {
      id: 1,
      orgId: "org-abc",
      projectId: 5,
      url: "https://example.com/hook",
      events: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      failureRate: null,
    };
    expect(() => projectWebhookRowContract.parse(raw)).toThrow();
  });
});

describe("webhooks cache key contract (BLD-X-BE-SETTINGS-WH-004)", () => {
  it("includes projectId in the webhook cache key — correct scope prevents cross-project data leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.webhooks(10);
    expect(key).toContain(10);
  });

  it("includes 'webhooks' segment in the cache key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.webhooks(10);
    expect(key.some((s: unknown) => s === "webhooks")).toBe(true);
  });

  it("webhook delivery key includes both projectId and webhookId — correct scope prevents cross-webhook delivery data leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.webhookDeliveries(10, 55);
    expect(key).toContain(10);
    expect(key).toContain(55);
  });

  it("two different projectIds produce different webhook cache keys — cross-project cache collision is impossible", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.webhooks(1);
    const key2 = buildWorkQueryKeys.projects.webhooks(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("webhook keys with and without filters are different — filtered and unfiltered queries cache independently", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const unfilteredKey = buildWorkQueryKeys.projects.webhooks(10);
    const filteredKey = buildWorkQueryKeys.projects.webhooks(10, { state: "active" });
    expect(JSON.stringify(unfilteredKey)).not.toBe(JSON.stringify(filteredKey));
  });
});
