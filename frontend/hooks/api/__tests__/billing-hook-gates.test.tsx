"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
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

  it("useWebhookEvents — idle when payments:providers:view denied", async () => {
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

  it("usePaymentAudit — idle when payments:providers:view denied", async () => {
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
    );
  });

  it("usePaymentCatalog — calls catalog URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentCatalog } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentCatalog(), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith("/payments/providers/catalog", undefined, expect.anything());
  });

  it("usePaymentProviders — calls providers URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentProviders } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentProviders(), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith("/payments/providers", undefined, expect.anything());
  });

  it("useTestTransactions — calls test-transactions URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { useTestTransactions } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => useTestTransactions("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/test-transactions",
      undefined,
      expect.anything(),
    );
  });

  it("useWebhookEvents — calls webhooks/events URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { useWebhookEvents } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => useWebhookEvents("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/webhooks/events",
      undefined,
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
      expect.anything(),
    );
  });

  it("usePaymentAudit — calls audit URL when payments:providers:view granted", async () => {
    useCan.mockReturnValue(true);
    const { usePaymentAudit } = await import("@/hooks/api/payments");
    const client = freshClient();
    renderHook(() => usePaymentAudit("razorpay"), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalledWith(
      "/payments/providers/razorpay/audit",
      undefined,
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
      expect.anything(),
    );
  });
});
