import {
  projectWebhookListContract,
  projectWebhookRowContract,
  webhookDeliveryListContract,
} from "./build-project-schema";

describe("projectWebhookListContract (BLD-X-BE-SETTINGS-WH-001)", () => {
  it("accepts a valid webhook list", () => {
    const raw = [
      {
        id: 1,
        orgId: "org-abc",
        projectId: 5,
        url: "https://example.com/webhook",
        events: ["ticket.created", "ticket.updated"],
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectWebhookListContract.parse(raw)).not.toThrow();
  });

  it("rejects a webhook missing url — the core field that identifies the endpoint", () => {
    const raw = [
      {
        id: 1,
        orgId: "org-abc",
        projectId: 5,
        events: ["ticket.created"],
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectWebhookListContract.parse(raw)).toThrow();
  });

  it("accepts an empty events array — a webhook with no subscriptions is valid", () => {
    const raw = [
      {
        id: 2,
        orgId: "org-abc",
        projectId: 5,
        url: "https://example.com/hook",
        events: [],
        isActive: false,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectWebhookListContract.parse(raw)).not.toThrow();
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
  it("accepts a single webhook row", () => {
    const raw = {
      id: 1,
      orgId: "org-abc",
      projectId: 5,
      url: "https://example.com/hook",
      events: ["member.added"],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const result = projectWebhookRowContract.parse(raw);
    expect(result.url).toBe("https://example.com/hook");
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
});
