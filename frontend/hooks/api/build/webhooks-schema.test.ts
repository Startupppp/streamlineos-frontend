import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { ZodError } from "zod";
import {
  projectWebhookListContract,
  projectWebhookRowContract,
} from "./build-project-schema";

const BASE_WEBHOOK_ITEM = {
  id: 1,
  orgId: "org-abc",
  projectId: 5,
  url: "https://example.com/webhook",
  events: ["ticket.created", "ticket.updated"],
  isActive: true,
  hasSecret: true,
  secretSetAt: "2024-01-01T00:00:00.000Z",
  version: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
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
    expect(() => projectWebhookListContract.parse(makePage([itemWithoutUrl]))).toThrow(ZodError);
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
    expect(() => projectWebhookListContract.parse(raw)).toThrow(ZodError);
  });
});

describe("webhookDeliveryPageContract (BLD-X-BE-SETTINGS-WH-002b — paginated deliveries)", () => {
  const BASE_DELIVERY = {
    id: 10,
    webhookId: 1,
    event: "ticket.created",
    status: "success" as const,
    responseCode: 200,
    attempts: 1,
    lastError: null,
    createdAt: "2024-06-01T12:00:00.000Z",
    deliveredAt: "2024-06-01T12:00:01.000Z",
  };

  it("accepts a valid page with items and null nextCursor — paired with reject test", async () => {
    const { projectsWebhooksListDeliveriesResponseSchema: webhookDeliveryPageContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = { items: [BASE_DELIVERY], nextCursor: null };
    expect(() => webhookDeliveryPageContract.parse(raw)).not.toThrow();
  });

  it("rejects a page missing items — the field is required for pagination to work", async () => {
    const { projectsWebhooksListDeliveriesResponseSchema: webhookDeliveryPageContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    expect(() => webhookDeliveryPageContract.parse({ nextCursor: null })).toThrow(ZodError);
  });

  it("accepts nextCursor as a number for keyset pagination", async () => {
    const { projectsWebhooksListDeliveriesResponseSchema: webhookDeliveryPageContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = { items: [BASE_DELIVERY], nextCursor: 55 };
    const parsed = webhookDeliveryPageContract.parse(raw);
    expect(parsed.nextCursor).toBe(55);
  });

  it("accepts failed deliveries with null deliveredAt — delivery was not completed", async () => {
    const { projectsWebhooksListDeliveriesResponseSchema: webhookDeliveryPageContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const failedDelivery = {
      ...BASE_DELIVERY,
      status: "failed" as const,
      responseCode: null,
      lastError: "Connection refused",
      deliveredAt: null,
    };
    expect(() => webhookDeliveryPageContract.parse({ items: [failedDelivery], nextCursor: null })).not.toThrow();
  });

  it("rejects a delivery with an unknown status — prevents 'timeout' slipping past the enum", async () => {
    const { projectsWebhooksListDeliveriesResponseSchema: webhookDeliveryPageContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const badDelivery = { ...BASE_DELIVERY, status: "timeout" };
    expect(() =>
      webhookDeliveryPageContract.parse({ items: [badDelivery], nextCursor: null }),
    ).toThrow(ZodError);
  });
});

describe("projectWebhookRotateSecretContract (BLD-X-BE-SETTINGS-WH-005)", () => {
  it("accepts a valid rotate-secret response — paired with reject to prevent vacuous positive", async () => {
    const { projectsWebhooksRotateSecretResponseSchema: projectWebhookRotateSecretContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = { id: 1, secret: "abc123def456", secretHint: "abc1..." };
    expect(() => projectWebhookRotateSecretContract.parse(raw)).not.toThrow();
  });

  it("rejects a response missing secret — the whole point is returning the new secret once", async () => {
    const { projectsWebhooksRotateSecretResponseSchema: projectWebhookRotateSecretContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    expect(() => projectWebhookRotateSecretContract.parse({ id: 1, secretHint: "abc1..." })).toThrow(ZodError);
  });
});

describe("webhookImpactContract (BLD-X-BE-SETTINGS-WH-006)", () => {
  it("accepts a valid impact response with delivery stats", async () => {
    const { projectsWebhooksGetImpactResponseSchema: webhookImpactContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = {
      webhookId: 1,
      events: ["ticket.created", "ticket.updated"],
      totalDeliveries: 100,
      successfulDeliveries: 95,
      lastSuccessAt: "2026-01-01T00:00:00.000Z",
      lastFailureAt: null,
    };
    expect(() => webhookImpactContract.parse(raw)).not.toThrow();
  });

  it("accepts zero-delivery stats when no deliveries have been made yet", async () => {
    const { projectsWebhooksGetImpactResponseSchema: webhookImpactContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = {
      webhookId: 2,
      events: [],
      totalDeliveries: 0,
      successfulDeliveries: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
    expect(() => webhookImpactContract.parse(raw)).not.toThrow();
  });

  it("rejects a response missing webhookId — paired with accept to prevent vacuous positive", async () => {
    const { projectsWebhooksGetImpactResponseSchema: webhookImpactContract } = await import(
      "@/contracts/build-contracts.generated"
    );
    const raw = { events: [], totalDeliveries: 0, successfulDeliveries: 0, lastSuccessAt: null, lastFailureAt: null };
    expect(() => webhookImpactContract.parse(raw)).toThrow(ZodError);
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
      hasSecret: true,
      secretSetAt: "2024-01-01T00:00:00.000Z",
      version: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
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
      hasSecret: true,
      secretSetAt: "2024-01-01T00:00:00.000Z",
      version: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      failureRate: null,
    };
    expect(() => projectWebhookRowContract.parse(raw)).toThrow(ZodError);
  });

  it("rejects a webhook row missing version, because a stale settings-panel toggle cannot send a concurrency token it was never given", () => {
    const raw = {
      id: 1,
      orgId: "org-abc",
      projectId: 5,
      url: "https://example.com/hook",
      events: ["member.added"],
      isActive: true,
      hasSecret: true,
      secretSetAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      failureRate: null,
    };
    expect(() => projectWebhookRowContract.parse(raw)).toThrow(ZodError);
  });
});

describe("webhooks cache key contract (BLD-X-BE-SETTINGS-WH-004)", () => {
  it("includes projectId in the webhook cache key — correct scope prevents cross-project data leaks", () => {
    const key = buildWorkQueryKeys.projects.webhooks(10);
    expect(key).toContain(10);
  });

  it("includes 'webhooks' segment in the cache key", () => {
    const key = buildWorkQueryKeys.projects.webhooks(10);
    expect(key.some((s: unknown) => s === "webhooks")).toBe(true);
  });

  it("webhook delivery key includes both projectId and webhookId — correct scope prevents cross-webhook delivery data leaks", () => {
    const key = buildWorkQueryKeys.projects.webhookDeliveries(10, 55);
    expect(key).toContain(10);
    expect(key).toContain(55);
  });

  it("two different projectIds produce different webhook cache keys — cross-project cache collision is impossible", () => {
    const key1 = buildWorkQueryKeys.projects.webhooks(1);
    const key2 = buildWorkQueryKeys.projects.webhooks(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("webhook keys with and without filters are different — filtered and unfiltered queries cache independently", () => {
    const unfilteredKey = buildWorkQueryKeys.projects.webhooks(10);
    const filteredKey = buildWorkQueryKeys.projects.webhooks(10, { state: "active" });
    expect(JSON.stringify(unfilteredKey)).not.toBe(JSON.stringify(filteredKey));
  });
});
