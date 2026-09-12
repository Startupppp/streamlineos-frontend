"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { apiClient } from "@/lib/api-client";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(false),
  useModuleEnabled: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { permissions: [] },
    refetch: jest.fn(),
  }),
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

const mockedGet = apiClient.get as jest.Mock;

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(false);
  mockedGet.mockReturnValue(new Promise(() => {}));
});

describe("billing hook gates — idle without permission", () => {
  it("useValidateCoupon — idle when billing:subscription:manage denied", async () => {
    const { useValidateCoupon } = await import("@/hooks/api/subscription");
    const client = freshClient();
    const { result } = renderHook(() => useValidateCoupon("abc", "STARTER"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("usePaymentCatalog — idle when payments:providers:view denied", async () => {
    const { usePaymentCatalog } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => usePaymentCatalog(), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("usePaymentProviders — idle when payments:providers:view denied", async () => {
    const { usePaymentProviders } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => usePaymentProviders(), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useTestTransactions — idle when payments:providers:view denied", async () => {
    const { useTestTransactions } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => useTestTransactions("razorpay"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useWebhookEvents — idle when payments:webhooks:view denied", async () => {
    const { useWebhookEvents } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => useWebhookEvents("razorpay"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("usePaymentReadiness — idle when payments:providers:view denied", async () => {
    const { usePaymentReadiness } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => usePaymentReadiness("razorpay"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("usePaymentAudit — idle when payments:audit:view denied", async () => {
    const { usePaymentAudit } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => usePaymentAudit("razorpay"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useManualMethods — idle when payments:providers:view denied", async () => {
    const { useManualMethods } = await import("@/hooks/api/payments");
    const client = freshClient();
    const { result } = renderHook(() => useManualMethods(), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe("billing hook gates — fire when permission granted", () => {
  it("useValidateCoupon — calls coupon validate URL when billing:subscription:manage granted", async () => {
    useCan.mockReturnValue(true);
    const { useValidateCoupon } = await import("@/hooks/api/subscription");
    const client = freshClient();
    renderHook(() => useValidateCoupon("abc", "STARTER"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining("/billing/coupons/validate"),
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("usePaymentCatalog — calls catalog URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentCatalog } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentCatalog(), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/catalog",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("usePaymentProviders — calls providers URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentProviders } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentProviders(), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("useTestTransactions — calls test-transactions URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { useTestTransactions } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => useTestTransactions("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/test-transactions",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("useWebhookEvents — calls webhooks/events URL when payments:webhooks:view granted", async () => {
    useCan.mockReturnValue(true);
    const { useWebhookEvents } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => useWebhookEvents("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/webhooks/events",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("usePaymentReadiness — calls readiness URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentReadiness } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentReadiness("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/readiness",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("usePaymentAudit — calls audit URL when payments:audit:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentAudit } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentAudit("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/audit",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("useManualMethods — calls the manual-methods URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { useManualMethods } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => useManualMethods(), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/manual-methods",
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });
});

const VERIFY_RESPONSE = {
  success: true as const,
  plan: "PROFESSIONAL" as const,
  billingCycle: "monthly" as const,
  status: "ACTIVE",
  currentPeriodEnd: "2027-01-01T00:00:00.000Z",
};

describe("useVerifySubscription — mutation body and invalidation", () => {
  it("sends only { orderId, paymentId, signature } and does NOT send plan", async () => {
    useCan.mockReturnValue(true);
    const mockedPatch = apiClient.patch as jest.Mock;
    mockedPatch.mockResolvedValueOnce(VERIFY_RESPONSE);

    const { useVerifySubscription } = await import("@/hooks/api/subscription");
    const client = freshClient();
    const { result } = renderHook(() => useVerifySubscription(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: "ord_abc",
        paymentId: "pay_xyz",
        signature: "sig_123",
      });
    });

    expect(mockedPatch).toHaveBeenCalledWith(
      "/billing/checkout",
      { orderId: "ord_abc", paymentId: "pay_xyz", signature: "sig_123" },
      undefined,
      expect.anything(),
    );
    const body = mockedPatch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("plan");
    expect(body).not.toHaveProperty("billingCycle");
    expect(body).not.toHaveProperty("couponId");
  });

  it("invalidates billing.subscription, billing.summary, billing.entitlements, billing.seats, and access.me on success", async () => {
    useCan.mockReturnValue(true);
    const mockedPatch = apiClient.patch as jest.Mock;
    mockedPatch.mockResolvedValueOnce(VERIFY_RESPONSE);

    const { useVerifySubscription } = await import("@/hooks/api/subscription");
    const client = freshClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useVerifySubscription(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: "ord_abc",
        paymentId: "pay_xyz",
        signature: "sig_123",
      });
    });

    const invalidatedKeyStrings = invalidateSpy.mock.calls.map((c) =>
      JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeyStrings.some((k) => k.includes('"subscription"'))).toBe(true);
    expect(invalidatedKeyStrings.some((k) => k.includes('"summary"'))).toBe(true);
    expect(invalidatedKeyStrings.some((k) => k.includes('"entitlements"'))).toBe(true);
    expect(invalidatedKeyStrings.some((k) => k.includes('"seats"'))).toBe(true);
    expect(invalidatedKeyStrings).toContain(
      JSON.stringify(platformCoreQueryKeys.access.me()),
    );
    expect(invalidatedKeyStrings).toContain(
      JSON.stringify(platformCoreQueryKeys.access.orgModules()),
    );
  });

  it("useValidateCoupon — passes billingCycle to the query URL when provided", async () => {
    useCan.mockReturnValue(true);
    const { useValidateCoupon } = await import("@/hooks/api/subscription");
    const client = freshClient();
    renderHook(() => useValidateCoupon("SAVE20", "STARTER", "annual"), {
      wrapper: makeWrapper(client),
    });
    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining("billingCycle=annual"),
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });
});
